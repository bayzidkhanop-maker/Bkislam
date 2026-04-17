import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Chat, Message } from './models';
import { subscribeToChats, subscribeToMessages, sendMessage, createOrGetChat, createGroupChat, markMessagesAsRead, getUser, deleteMessage, getAllUsers } from './firestoreService';
import { uploadMedia } from './storageService';
import { Card, Input, Button, MediaRenderer, Loader } from './widgets';
import { Search, MoreVertical, Phone, Video, Image as ImageIcon, Paperclip, Mic, Send, ArrowLeft, Check, CheckCheck, Pin, Archive, Trash2, Reply, X, Users } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from './widgets';
import { toast } from 'sonner';

import { startCall, initLocalStream } from './callService';

export const InboxPage = ({ currentUser }: { currentUser: User }) => {
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreateGroup) {
      getAllUsers().then(setAllSystemUsers).catch(() => {});
    }
  }, [showCreateGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupUsers.length === 0) return;
    try {
      await createGroupChat(currentUser.uid, selectedGroupUsers, newGroupName.trim());
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedGroupUsers([]);
      toast.success("Group created!");
      // Automatically it will sync through subscribeToChats
    } catch (e) {
      toast.error("Failed to create group");
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Handle starting a new chat from profile
  useEffect(() => {
    const startChatWith = location.state?.startChatWith;
    if (startChatWith && startChatWith !== currentUser.uid) {
      const initChat = async () => {
        try {
          const chat = await createOrGetChat(currentUser.uid, startChatWith);
          setActiveChat(chat);
          setIsMobileListVisible(false);
          
          // Ensure user is loaded
          if (!users[startChatWith]) {
            const u = await getUser(startChatWith);
            if (u) setUsers(prev => ({ ...prev, [startChatWith]: u }));
          }
        } catch (error) {
          toast.error("Failed to start chat");
        }
      };
      initChat();
    }
  }, [location.state, currentUser.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToChats(currentUser.uid, async (fetchedChats) => {
      setChats(fetchedChats);
      
      // Fetch user details for participants
      const userIds = new Set<string>();
      fetchedChats.forEach(c => c.participants.forEach(p => p !== currentUser.uid && userIds.add(p)));
      
      const newUsers = { ...users };
      let hasNewUsers = false;
      for (const uid of userIds) {
        if (!newUsers[uid]) {
          const u = await getUser(uid);
          if (u) {
            newUsers[uid] = u;
            hasNewUsers = true;
          }
        }
      }
      if (hasNewUsers) setUsers(newUsers);
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    if (activeChat) {
      const unsubscribe = subscribeToMessages(activeChat.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
        markMessagesAsRead(activeChat.id, currentUser.uid);
        scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voicenote-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleVoiceUpload(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // prevent upload by clearing chunks
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
  };

  const handleVoiceUpload = async (file: File) => {
    if (!activeChat || audioChunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const path = `chats/${activeChat.id}/${file.name}`;
      const url = await uploadMedia(file, path);
      await sendMessage(activeChat.id, currentUser.uid, 'Voice Message', 'voice', url, file.name, file.size);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChat || (!newMessage.trim() && !uploading)) return;

    const text = newMessage;
    setNewMessage('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      await sendMessage(activeChat.id, currentUser.uid, text, 'text', undefined, undefined, undefined, replyId);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setUploading(true);
    try {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      const path = `chats/${activeChat.id}/${Date.now()}-${file.name}`;
      const url = await uploadMedia(file, path);
      
      await sendMessage(activeChat.id, currentUser.uid, file.name, type, url, file.name, file.size);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(p => p !== currentUser.uid);
    return otherId ? users[otherId] : null;
  };

  const filteredChats = chats.filter(chat => {
    const otherUser = getOtherParticipant(chat);
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto flex bg-white dark:bg-gray-900 overflow-hidden border-x border-gray-200 dark:border-gray-800">
      
      {/* Sidebar / Chat List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300",
        !isMobileListVisible && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-full transition-colors tooltip"
              title="New Group Chat"
            >
              <Users size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isUnread = chat.unreadCount[currentUser.uid] > 0;
            const isActive = activeChat?.id === chat.id;

            return (
              <div 
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  setIsMobileListVisible(false);
                }}
                className={cn(
                  "p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800/50",
                  isActive && "bg-indigo-50 dark:bg-indigo-900/20"
                )}
              >
                <div className="relative">
                  {chat.type === 'group' ? (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600">
                      <Users size={24} />
                    </div>
                  ) : (
                    <img src={otherUser?.avatarURL || `https://ui-avatars.com/api/?name=${otherUser?.name}`} alt="" className="w-12 h-12 rounded-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {chat.type === 'group' ? chat.name || 'Group Chat' : otherUser?.name || 'Unknown'}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatDistanceToNow(chat.lastMessage.createdAt, { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn(
                      "text-sm truncate",
                      isUnread ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"
                    )}>
                      {chat.lastMessage?.senderId === currentUser.uid ? 'You: ' : ''}
                      {chat.lastMessage?.text || 'No messages yet'}
                    </p>
                    {isUnread && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                        {chat.unreadCount[currentUser.uid]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 relative",
        isMobileListVisible && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                </button>
                {activeChat.type === 'group' ? (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600">
                    <Users size={20} />
                  </div>
                ) : (
                  <img 
                    src={getOtherParticipant(activeChat)?.avatarURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(activeChat)?.name}`} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {activeChat.type === 'group' ? activeChat.name || 'Group Chat' : getOtherParticipant(activeChat)?.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeChat.type === 'group' ? `${activeChat.participants.length} participants` : 'Tap here for contact info'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={async () => {
                    if (activeChat.type === 'group') {
                      toast.info("Group video calls are rolling out soon!");
                      return;
                    }
                    const otherUser = getOtherParticipant(activeChat);
                    if (otherUser) {
                      try {
                        await startCall(currentUser.uid, otherUser.uid, 'video', () => {});
                      } catch (e) {
                        toast.error("Failed to start video call");
                      }
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Video size={20} />
                </button>
                <button 
                  onClick={async () => {
                    if (activeChat.type === 'group') {
                      toast.info("Group audio calls are rolling out soon!");
                      return;
                    }
                    const otherUser = getOtherParticipant(activeChat);
                    if (otherUser) {
                      try {
                        await startCall(currentUser.uid, otherUser.uid, 'audio', () => {});
                      } catch (e) {
                        toast.error("Failed to start audio call");
                      }
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Phone size={20} />
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat', opacity: 0.8 }}>
              {messages.map((msg, index) => {
                const isMine = msg.senderId === currentUser.uid;
                const showDate = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm">
                          {format(msg.createdAt, 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      {!isMine && activeChat.type === 'group' && (
                        <div className="mr-2 self-end mb-1">
                          <img src={users[msg.senderId]?.avatarURL || `https://ui-avatars.com/api/?name=${users[msg.senderId]?.name}`} className="w-6 h-6 rounded-full object-cover" alt="" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative group",
                        isMine 
                          ? "bg-[#d9fdd3] dark:bg-indigo-600 text-gray-900 dark:text-white rounded-tr-sm" 
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm"
                      )}>
                        {!isMine && activeChat.type === 'group' && (
                           <p className="text-xs font-bold text-indigo-500 mb-1">{users[msg.senderId]?.name || 'Unknown'}</p>
                        )}
                        {/* Reply Context */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/5 dark:bg-black/20 rounded-lg text-sm border-l-4 border-indigo-500">
                            <p className="font-semibold text-indigo-600 dark:text-indigo-300 text-xs mb-1">Replying to</p>
                            <p className="truncate opacity-80">{messages.find(m => m.id === msg.replyTo)?.text || 'Message'}</p>
                          </div>
                        )}

                        {/* Media Content */}
                        {msg.type === 'voice' && msg.mediaUrl && (
                          <div className="mb-2 w-48 sm:w-64">
                            <audio src={msg.mediaUrl} controls className="w-full h-10" />
                          </div>
                        )}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden">
                            <MediaRenderer url={msg.mediaUrl} type="image" className="w-full max-h-64 object-cover" />
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden bg-black">
                            <MediaRenderer url={msg.mediaUrl} type="video" className="w-full max-h-64" />
                          </div>
                        )}
                        {msg.type === 'file' && (
                          <div className="flex items-center gap-3 p-3 bg-black/5 dark:bg-black/20 rounded-xl mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-lg">
                              <Paperclip size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.fileName}</p>
                              <p className="text-xs opacity-70">{(msg.fileSize || 0) / 1024 > 1024 ? `${((msg.fileSize || 0) / 1024 / 1024).toFixed(2)} MB` : `${Math.round((msg.fileSize || 0) / 1024)} KB`}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                        
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                          <span className="text-[10px]">{format(msg.createdAt, 'HH:mm')}</span>
                          {isMine && (
                            msg.status === 'read' ? <CheckCheck size={14} className="text-blue-500" /> :
                            msg.status === 'delivered' ? <CheckCheck size={14} /> :
                            <Check size={14} />
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className={cn(
                          "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm p-1",
                          isMine ? "-left-24" : "-right-24"
                        )}>
                          <button onClick={() => setReplyingTo(msg)} className="p-1 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100" title="Reply"><Reply size={14} /></button>
                          <button onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            toast.success('Copied!');
                          }} className="p-1 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100" title="Copy">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          {isMine && <button onClick={() => deleteMessage(msg.id, 'for_everyone')} className="p-1 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100" title="Delete"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-gray-800 p-3 sm:p-4">
              {replyingTo && (
                <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-xl flex items-start justify-between shadow-sm border-l-4 border-indigo-500">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-1">Replying to {replyingTo.senderId === currentUser.uid ? 'yourself' : getOtherParticipant(activeChat)?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{replyingTo.text || `Attached ${replyingTo.type}`}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex items-center gap-1 sm:gap-2 pb-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <Paperclip size={22} />
                  </button>
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:block">
                    <ImageIcon size={22} />
                  </button>
                </div>
                
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent focus-within:border-indigo-500 transition-colors flex items-center min-h-[44px]">
                  {isRecording ? (
                    <div className="w-full flex items-center justify-between px-4 py-2 text-red-500 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Mic size={18} />
                        <span className="font-medium text-sm">
                          Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <button type="button" onClick={cancelRecording} className="text-gray-500 hover:text-red-500 px-2 py-1 text-xs font-bold uppercase">Cancel</button>
                    </div>
                  ) : (
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message"
                      className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 px-4 text-[15px]"
                      rows={1}
                      style={{ minHeight: '44px' }}
                    />
                  )}
                </div>
                
                <div className="pb-1">
                  {isRecording ? (
                    <button 
                      type="button" 
                      onClick={stopRecording}
                      className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <Send size={20} className="ml-1" />
                    </button>
                  ) : newMessage.trim() || uploading ? (
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {uploading ? <Loader className="w-5 h-5 p-0" /> : <Send size={20} className="ml-1" />}
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startRecording}
                      className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <Mic size={24} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-900 p-8 text-center">
            <div className="w-64 h-64 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-8">
              <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" alt="Chat" className="w-32 h-32 opacity-50" />
            </div>
            <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200 mb-4">DeenStream Web</h2>
            <p className="text-gray-500 max-w-md">Send and receive messages without keeping your phone online. Use DeenStream on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </div>

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New Group Chat</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <Input 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="E.g., Team Alpha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Members</label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {allSystemUsers.filter(u => u.uid !== currentUser.uid).map(user => (
                    <label key={user.uid} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedGroupUsers.includes(user.uid)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedGroupUsers([...selectedGroupUsers, user.uid]);
                          else setSelectedGroupUsers(selectedGroupUsers.filter(id => id !== user.uid));
                        }}
                        className="rounded text-indigo-600" 
                      />
                      <img src={user.avatarURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-sm font-medium">{user.name}</span>
                    </label>
                  ))}
                  {allSystemUsers.length <= 1 && <p className="text-center text-sm text-gray-500 py-4">No other users found.</p>}
                </div>
              </div>

              <Button 
                onClick={handleCreateGroup} 
                className="w-full"
                disabled={!newGroupName.trim() || selectedGroupUsers.length === 0}
              >
                Create Group
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

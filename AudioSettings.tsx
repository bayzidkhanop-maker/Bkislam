import React, { useState, useEffect } from 'react';
import { Card, Button } from './widgets';
import { Volume2, VolumeX, Bell, MessageSquare, Phone, Moon, Clock } from 'lucide-react';
import { soundService, SoundSettings } from './soundService';

export const AudioSettings = () => {
  const [settings, setSettings] = useState<SoundSettings>(soundService.getSettings());

  const updateSetting = (key: keyof SoundSettings, value: any) => {
     const newSettings = { ...settings, [key]: value };
     setSettings(newSettings);
     soundService.saveSettings(newSettings);
  };

  const playPreview = (type: any) => {
     soundService.play(type);
  };

  return (
    <Card className="mt-8 overflow-hidden border-0 shadow-sm ring-1 ring-gray-100">
      <div className="p-6 sm:p-8 space-y-8">
         <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
               <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <Volume2 className="text-indigo-600" />
                 Professional Audio & Feedback System
               </h2>
               <p className="text-sm text-gray-500 mt-1">Manage all interactive and system sound profiles</p>
            </div>
            
            <button
               onClick={() => {
                  updateSetting('enabled', !settings.enabled);
                  if (!settings.enabled) soundService.play('success');
               }}
               className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${settings.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
               <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
         </div>

         <div className={`space-y-6 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
           {/* Master Volume */}
           <div>
               <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Master Volume</label>
                  <span className="text-xs font-bold text-gray-500">{settings.masterVolume}%</span>
               </div>
               <input
                 type="range"
                 min="0" max="100"
                 value={settings.masterVolume}
                 onChange={(e) => updateSetting('masterVolume', parseInt(e.target.value))}
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               />
           </div>

           {/* Separate Controls */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                     <Bell size={16} /> Notifications
                   </div>
                   <button onClick={() => playPreview('notification')} className="text-xs text-indigo-500 hover:underline">Test</button>
                 </div>
                 <input
                   type="range" min="0" max="100"
                   value={settings.notificationsVolume}
                   onChange={(e) => updateSetting('notificationsVolume', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                     <MessageSquare size={16} /> Chat & Messages
                   </div>
                   <button onClick={() => playPreview('messageReceive')} className="text-xs text-indigo-500 hover:underline">Test</button>
                 </div>
                 <input
                   type="range" min="0" max="100"
                   value={settings.chatVolume}
                   onChange={(e) => updateSetting('chatVolume', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                     <Phone size={16} /> Calls (Ringtone)
                   </div>
                   <button onClick={() => playPreview('callRing')} className="text-xs text-indigo-500 hover:underline">Test</button>
                 </div>
                 <input
                   type="range" min="0" max="100"
                   value={settings.callsVolume}
                   onChange={(e) => updateSetting('callsVolume', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>
           </div>

           {/* Do Not Disturb */}
           <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Moon size={16} className="text-indigo-600" /> Do Not Disturb Mode
                </h4>
                <p className="text-xs text-gray-500 mt-1">Automatically mute non-vital sounds during scheduled hours.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Clock size={14} className="text-gray-400" />
                  <input 
                    type="number" min="0" max="23" 
                    value={settings.dndStartHour} 
                    onChange={(e) => updateSetting('dndStartHour', parseInt(e.target.value))}
                    className="w-10 text-center bg-transparent text-sm focus:outline-none" 
                  />
                  <span className="text-gray-400">:00 to</span>
                  <input 
                    type="number" min="0" max="23" 
                    value={settings.dndEndHour} 
                    onChange={(e) => updateSetting('dndEndHour', parseInt(e.target.value))}
                    className="w-10 text-center bg-transparent text-sm focus:outline-none" 
                  />
                  <span className="text-gray-400">:00</span>
                </div>
                <button
                   onClick={() => updateSetting('doNotDisturb', !settings.doNotDisturb)}
                   className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${settings.doNotDisturb ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.doNotDisturb ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
           </div>
         </div>
      </div>
    </Card>
  );
};

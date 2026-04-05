import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Save, Image as ImageIcon } from 'lucide-react';
import { createTournament } from './firestoreService';
import { User } from './models';
import { toast } from 'sonner';

export const TournamentCreatePage = ({ currentUser }: { currentUser: User }) => {
  const navigate = useNavigate();
  const user = currentUser;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    game: 'Free Fire',
    type: 'solo',
    entryFee: 0,
    prizePool: 0,
    maxPlayers: 48,
    scheduledAt: '',
    rules: '',
    bannerUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'entryFee' || name === 'prizePool' || name === 'maxPlayers' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const newTournament = await createTournament({
        title: formData.title,
        game: formData.game,
        type: formData.type as any,
        entryFee: formData.entryFee,
        prizePool: formData.prizePool,
        maxPlayers: formData.maxPlayers,
        scheduledAt: new Date(formData.scheduledAt).getTime(),
        rules: formData.rules,
        bannerUrl: formData.bannerUrl,
        hostId: user.uid,
      });
      toast.success("Tournament created successfully!");
      navigate(`/tournaments/${newTournament.id}/manage`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create tournament");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600/20 rounded-xl">
            <Trophy className="text-indigo-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Tournament</h1>
            <p className="text-gray-400 text-sm">Set up a new esports tournament</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tournament Title</label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Free Fire Pro League 2026"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Game</label>
                <select
                  name="game"
                  value={formData.game}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Free Fire">Free Fire</option>
                  <option value="PUBG Mobile">PUBG Mobile</option>
                  <option value="Valorant">Valorant</option>
                  <option value="Mobile Legends">Mobile Legends</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="squad">Squad</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entry Fee (৳)</label>
                <input
                  type="number"
                  name="entryFee"
                  min="0"
                  required
                  value={formData.entryFee}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prize Pool (৳)</label>
                <input
                  type="number"
                  name="prizePool"
                  min="0"
                  required
                  value={formData.prizePool}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Players</label>
                <input
                  type="number"
                  name="maxPlayers"
                  min="2"
                  required
                  value={formData.maxPlayers}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                required
                value={formData.scheduledAt}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Banner Image URL (Optional)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="url"
                  name="bannerUrl"
                  value={formData.bannerUrl}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rules & Details</label>
              <textarea
                name="rules"
                required
                value={formData.rules}
                onChange={handleChange}
                rows={5}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter tournament rules, point system, and other details..."
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save size={18} /> Create Tournament</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

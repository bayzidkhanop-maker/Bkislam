import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportPost } from './firestoreService';
import { User } from './models';
import { Card, Button } from './widgets';

export const ReportPage = ({ currentUser }: { currentUser: User }) => {
  const { postId } = useParams<{ postId: string }>();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !reason.trim()) return;
    
    setSubmitting(true);
    try {
      await reportPost(postId, reason, currentUser.uid);
      alert('Report submitted successfully.');
      navigate(-1);
    } catch (error) {
      console.error('Failed to submit report', error);
      alert('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <h1 className="text-2xl font-bold mb-6">Report Post</h1>
        <p className="mb-4 text-gray-600">Please let us know why you are reporting this post.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="w-full p-2 border rounded"
              placeholder="E.g., Inappropriate content, spam, etc."
            />
          </div>
          <div className="flex space-x-2">
            <Button type="button" onClick={() => navigate(-1)} className="bg-gray-500 flex-1">Cancel</Button>
            <Button type="submit" disabled={submitting || !reason.trim()} className="flex-1">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

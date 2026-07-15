'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { uploadFileToR2 } from '../../../lib/r2';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];

export default function NewExercise() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [instructions, setInstructions] = useState('');
  
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/');
      } else {
        setCoachId(session.user.id);
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'gif' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    if (type === 'gif') {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('GIF size must be less than 5MB, dude.');
        return;
      }
      setGifFile(file);
    } else {
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg('Video size must be less than 50MB.');
        return;
      }
      setVideoFile(file);
    }
  };

  const uploadToStorage = async (file: File, folder: string): Promise<string> => {
    // Simulate upload progress since we don't have direct progress events in the Edge function upload
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 150);

    try {
      const r2Folder = `exercises/${folder}`;
      const result = await uploadFileToR2(file, r2Folder);

      clearInterval(interval);
      if (!result.success || !result.url) {
        throw new Error(result.error || `Upload to R2 failed for folder ${folder}`);
      }

      return result.url;
    } catch (err) {
      clearInterval(interval);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !instructions || !gifFile || !coachId) {
      setErrorMsg('Please enter a name, instructions, and upload a guide GIF.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setUploadProgress(10);

      // 1. Upload GIF
      const gifUrl = await uploadToStorage(gifFile, 'gifs');
      setUploadProgress(60);

      // 2. Upload Video (if provided)
      let videoUrl = '';
      if (videoFile) {
        videoUrl = await uploadToStorage(videoFile, 'videos');
      }
      setUploadProgress(90);

      // 3. Save Exercise record
      const { error } = await supabase
        .from('exercises')
        .insert({
          name,
          muscle_group: muscleGroup,
          instructions,
          gif_url: gifUrl,
          video_url: videoUrl || null,
          created_by_coach_id: coachId
        });

      if (error) throw error;

      setUploadProgress(100);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission.');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background hacker grid overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="w-full max-w-2xl bg-[#161616]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/[0.06] shadow-2xl relative z-10">
        {/* Glow Header bar */}
        <div style={{ backgroundImage: 'linear-gradient(90deg, #39FF6A, #00fbfb)', height: 3, position: 'absolute', top: 0, left: 0, right: 0 }} />

        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider gap-2 mb-6"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
 
        <h1 className="text-3xl font-black tracking-tight mb-1">Create Exercise</h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-8">Add visual guides to the library</p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-[#ffb4ab] text-xs px-4 py-3.5 rounded-xl mb-6 flex items-center gap-2.5">
            <AlertTriangle size={16} />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exercise Name */}
          <div>
            <label className="block text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">Exercise Name</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Incline DB Bench Press"
              className="w-full bg-black/40 text-white px-4 py-3.5 rounded-xl border border-white/[0.04] focus:border-[#39FF6A]/40 transition-all font-semibold outline-none"
            />
          </div>

          {/* Muscle Group Selector */}
          <div>
            <label className="block text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">Muscle Group</label>
            <select
              value={muscleGroup}
              onChange={e => setMuscleGroup(e.target.value)}
              className="w-full bg-black/40 text-white px-4 py-3.5 rounded-xl border border-white/[0.04] focus:border-[#39FF6A]/40 transition-all font-bold outline-none"
            >
              {MUSCLE_GROUPS.map(mg => (
                <option key={mg} value={mg} className="bg-[#161616] text-white font-semibold">{mg}</option>
              ))}
            </select>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">Instructions</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Provide step-by-step performance cues..."
              rows={4}
              className="w-full bg-black/40 text-white px-4 py-3.5 rounded-xl border border-white/[0.04] focus:border-[#39FF6A]/40 transition-all font-semibold outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Media Upload Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* GIF upload */}
            <div className="flex flex-col">
              <label className="block text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">Guide GIF (Max 5MB)</label>
              <label className={`flex-1 flex flex-col items-center justify-center border border-dashed rounded-2xl cursor-pointer p-5 transition-all text-center ${
                gifFile ? 'border-[#39FF6A]/50 bg-[#39FF6A]/5' : 'border-white/[0.08] bg-black/20 hover:border-[#39FF6A]/30'
              }`}>
                <input 
                  type="file" 
                  accept="image/gif"
                  onChange={e => handleFileChange(e, 'gif')}
                  className="hidden"
                />
                {gifFile ? (
                  <>
                    <CheckCircle className="text-[#39FF6A] mb-2" size={24} />
                    <span className="text-white text-xs font-black truncate max-w-[180px]">{gifFile.name}</span>
                    <span className="text-gray-500 text-[9px] font-bold mt-1 uppercase">{(gifFile.size/1024/1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <Upload className="text-gray-500 mb-2" size={24} />
                    <span className="text-gray-400 text-xs font-semibold">Choose GIF File</span>
                    <span className="text-gray-600 text-[9px] font-bold mt-1 uppercase">Required</span>
                  </>
                )}
              </label>
            </div>

            {/* Video upload */}
            <div className="flex flex-col">
              <label className="block text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">Reference Video (Max 50MB)</label>
              <label className={`flex-1 flex flex-col items-center justify-center border border-dashed rounded-2xl cursor-pointer p-5 transition-all text-center ${
                videoFile ? 'border-[#00fbfb]/50 bg-[#00fbfb]/5' : 'border-white/[0.08] bg-black/20 hover:border-[#00fbfb]/30'
              }`}>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={e => handleFileChange(e, 'video')}
                  className="hidden"
                />
                {videoFile ? (
                  <>
                    <CheckCircle className="text-[#00fbfb] mb-2" size={24} />
                    <span className="text-white text-xs font-black truncate max-w-[180px]">{videoFile.name}</span>
                    <span className="text-gray-500 text-[9px] font-bold mt-1 uppercase">{(videoFile.size/1024/1024).toFixed(2)} MB</span>
                  </>
                ) : (
                  <>
                    <Upload className="text-gray-500 mb-2" size={24} />
                    <span className="text-gray-400 text-xs font-semibold">Choose Video File</span>
                    <span className="text-gray-600 text-[9px] font-bold mt-1 uppercase">Optional</span>
                  </>
                )}
              </label>
            </div>

          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase">Uploading assets...</span>
                <span className="text-[#39FF6A] font-mono font-black">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
                <div 
                  className="h-full bg-gradient-to-r from-[#39FF6A] to-[#00fbfb] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#39FF6A] text-black font-black py-4 rounded-xl active:scale-[0.98] transition-all text-xs uppercase tracking-widest justify-center items-center flex"
          >
            {isSubmitting ? 'Uploading & Creating...' : 'Create Exercise'}
          </button>
        </form>
      </div>
    </div>
  );
}

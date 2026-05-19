"use client";

import React from 'react';

export default function WebhookKeyGenerator() {
  const handleGenerate = () => {
    const key = 'UW-' + Math.random().toString(36).substring(7).toUpperCase();
    alert(`Webhook API Key Generated: ${key}\n\nNote: This is a client-side simulation for now.`);
  };

  return (
    <button 
      onClick={handleGenerate}
      className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-zinc-200 transition-colors"
    >
      Generate Webhook Key
    </button>
  );
}

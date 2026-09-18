"use client";

import { DifyChat } from "@/components/doctor/dify-chat";

export default function AiChatbotPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">AI Chatbot</h1>
      <DifyChat appCode="45322G8rzGMEW7WP" />
    </div>
  );
}
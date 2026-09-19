"use client";

import { DifyChat } from "@/components/doctor/dify-chat";

export default function AiChatbotPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">AI Chatbot</h1>
      <DifyChat appCode="z0RCp1YQHYqySPZF" />
    </div>
  );
}
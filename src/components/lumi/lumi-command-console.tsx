"use client";

import { Bot, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { parseLumiCommand } from "@/services/lumi-command.service";
import { useSimulationStore } from "@/store/simulation-store";

interface LumiMessage {
  id: string;
  role: "user" | "lumi";
  content: string;
  success?: boolean;
}

const initialMessages: LumiMessage[] = [
  {
    id: "welcome",
    role: "lumi",
    content:
      "LUMI industrial control interface is online. Try “Start CH-02”, “Set AHU-02 fan speed to 85%”, or “Show plant status”.",
    success: true,
  },
];

export function LumiCommandConsole() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LumiMessage[]>(initialMessages);

  const executeCommand = useSimulationStore((state) => state.executeCommand);

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    const command = parseLumiCommand(trimmedInput);
    const result = executeCommand(command);

    const timestamp = Date.now();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmedInput,
      },
      {
        id: `lumi-${timestamp}`,
        role: "lumi",
        content: result.message,
        success: result.success,
      },
    ]);

    setInput("");
  }

  return (
    <section className="flex min-h-[440px] flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
      <header className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2">
          <Bot size={22} className="text-cyan-300" />
        </div>

        <div>
          <h2 className="font-semibold text-white">LUMI Command Center</h2>

          <p className="text-xs text-emerald-400">
            Virtual control interface online
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%]"
                : "mr-auto max-w-[90%]"
            }
          >
            <div
              className={[
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-cyan-500 text-slate-950"
                  : message.success === false
                    ? "border border-red-500/30 bg-red-500/10 text-red-200"
                    : "border border-slate-700 bg-slate-950 text-slate-200",
              ].join(" ")}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submitCommand} className="border-t border-slate-800 p-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a LUMI command..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />

          <button
            type="submit"
            className="flex items-center justify-center rounded-xl bg-cyan-400 px-4 text-slate-950 transition hover:bg-cyan-300"
            aria-label="Send command"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}

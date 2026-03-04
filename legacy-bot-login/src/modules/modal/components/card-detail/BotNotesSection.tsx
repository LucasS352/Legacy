import { useState } from "react";
import { Bot, User, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  author: "bot" | "user";
  content: string;
  timestamp: string;
}

interface BotNotesSectionProps {
  notes: Note[];
  onAddNote?: (content: string) => void;
}

const BotNotesSection = ({ notes, onAddNote }: BotNotesSectionProps) => {
  const [newNote, setNewNote] = useState("");

  const handleSend = () => {
    if (newNote.trim() && onAddNote) {
      onAddNote(newNote.trim());
      setNewNote("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
        Anotações & Bot
      </h3>

      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1 mb-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "flex gap-2.5 animate-fade-in",
              note.author === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                note.author === "bot"
                  ? "bg-primary/20"
                  : "bg-secondary"
              )}
            >
              {note.author === "bot" ? (
                <Bot className="w-3.5 h-3.5 text-primary" />
              ) : (
                <User className="w-3.5 h-3.5 text-foreground" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-3.5 py-2.5",
                note.author === "bot"
                  ? "bg-secondary rounded-tl-sm"
                  : "bg-primary/15 rounded-tr-sm"
              )}
            >
              <p className="text-sm leading-relaxed">{note.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{note.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escreva uma anotação..."
          className="flex-1 bg-secondary rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!newNote.trim()}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BotNotesSection;

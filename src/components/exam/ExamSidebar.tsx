import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";

interface Question {
  id: string;
  number: string;
  text: string;
  type: 'heading' | 'question';
}

interface ExamSidebarProps {
  questions: Question[];
  activeQuestion: string;
  onQuestionClick: (questionId: string) => void;
}

export function ExamSidebar({ questions, activeQuestion, onQuestionClick }: ExamSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = questions.filter(q => 
    q.type === 'question' && 
    (q.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
     q.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredQuestions.map((question) => (
            <button
              key={question.id}
              onClick={() => onQuestionClick(question.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all hover:bg-accent/50 ${
                activeQuestion === question.id 
                  ? 'bg-primary/10 border-l-4 border-primary' 
                  : 'border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <Badge 
                  variant={activeQuestion === question.id ? "default" : "secondary"} 
                  className="shrink-0 mt-0.5"
                >
                  {question.number}
                </Badge>
                <p className={`text-sm line-clamp-2 ${
                  activeQuestion === question.id ? 'font-medium' : 'text-muted-foreground'
                }`}>
                  {question.text}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

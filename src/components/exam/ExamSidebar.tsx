import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ExamSidebar({ questions, activeQuestion, onQuestionClick, collapsed, onToggleCollapse }: ExamSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = questions.filter(q => 
    q.type === 'question' && 
    (q.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
     q.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
        onClick={onToggleCollapse}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Questions List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredQuestions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => onQuestionClick(question.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    activeQuestion === question.id && "bg-muted border-l-4 border-primary",
                    question.type === 'heading' && "font-semibold text-sm"
                  )}
                >
                  {question.type === 'question' ? (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{question.number}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {question.text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm line-clamp-1">{question.text}</div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

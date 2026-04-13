import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMarkdownProps = {
  content: string;
};

const components: Components = {
  a: (props) => <a target="_blank" rel="noopener noreferrer" {...props} />,
};

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

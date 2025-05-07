import * as React from "react";
import { cn } from "@/app/components/utils";

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wordLimit?: number;
}

const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({ className, wordLimit, ...props }, ref) => {
    const [wordCount, setWordCount] = React.useState(0);
    const [text, setText] = React.useState('');

    React.useEffect(() => {
      const words = text.trim().split(/\s+/);
      setWordCount(words.length === 1 && words[0] === '' ? 0 : words.length);
    }, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      const words = newText.trim().split(/\s+/);
      if (words.length <= (wordLimit || Infinity) || newText.length < text.length) {
        setText(newText);
        if (props.onChange) {
          props.onChange(e);
        }
      }
    };

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          value={text}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {wordLimit && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {wordCount}/{wordLimit} words
          </div>
        )}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";

export { CustomInput }; 
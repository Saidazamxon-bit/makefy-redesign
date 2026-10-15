import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const TextGenerateEffect = React.forwardRef(function TextGenerateEffect(
  {
    words,
    className,
    filter = true,
    duration = 0.5,
    staggerDelay = 0.2,
    ...props
  },
  ref,
) {
  const localRef = React.useRef(null);
  React.useImperativeHandle(ref, () => localRef.current, []);

  const wordsArray = React.useMemo(() => words.split(' '), [words]);

  return (
    <div
      ref={localRef}
      className={cn('font-bold', className)}
      data-slot="text-generate-effect"
      {...props}
    >
      {wordsArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          className="mr-2 inline-block last:mr-0"
          initial={{ opacity: 0, filter: filter ? 'blur(10px)' : 'none', y: 8 }}
          animate={{ opacity: 1, filter: filter ? 'blur(0px)' : 'none', y: 0 }}
          transition={{
            duration,
            delay: idx * staggerDelay,
            ease: 'easeOut',
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
});

export { TextGenerateEffect };
export default TextGenerateEffect;

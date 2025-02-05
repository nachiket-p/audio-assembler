'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InfoCircledIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Template } from "@/lib/types"
import { Highlight, themes } from "prism-react-renderer"

interface JsonPreviewProps {
  template: Template
}

export default function JsonPreview({ template }: JsonPreviewProps) {
  const formattedJson = JSON.stringify(template, null, 2)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4">
          <InfoCircledIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Template Configuration</DialogTitle>
        </DialogHeader>
        <div className="mt-4 relative">
          <Highlight
            theme={themes.vsLight}
            code={formattedJson}
            language="json"
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre 
                className="p-4 rounded-lg bg-secondary overflow-x-auto max-h-[60vh] text-sm"
                style={{
                  ...style,
                  overflowWrap: 'normal',
                  whiteSpace: 'pre',
                  wordBreak: 'keep-all',
                }}
              >
                <code>
                  {tokens.map((line, i) => (
                    <div 
                      key={i} 
                      {...getLineProps({ line })}
                      style={{ display: 'table-row' }}
                    >
                      <span style={{ display: 'table-cell', paddingRight: '1rem' }}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            )}
          </Highlight>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
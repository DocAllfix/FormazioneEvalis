// Rende i `blocks` (jsonb) di una slide. Tipi noti dal formato corso: heading,
// paragraph, list. Sconosciuti → ignorati (no crash su contenuti futuri).

type Block = {
  type?: string;
  text?: string;
  items?: string[];
  [k: string]: unknown;
};

export function BlockRenderer({ blocks }: { blocks: unknown }) {
  const list = Array.isArray(blocks) ? (blocks as Block[]) : [];
  return (
    <div className="space-y-5">
      {list.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2
                key={i}
                className="font-heading text-2xl text-near-black md:text-3xl"
              >
                {b.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="text-base leading-relaxed text-foreground/80">
                {b.text}
              </p>
            );
          case "list":
            return (
              <ul
                key={i}
                className="list-disc space-y-1.5 pl-6 text-base leading-relaxed text-foreground/80"
              >
                {(b.items ?? []).map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

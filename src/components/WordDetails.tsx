import { BookOpen, Check, ChevronDown, Lightbulb, X } from "lucide-react";
import type { Word } from "../lib/model";
import PronunciationControls from "./PronunciationControls";

function Highlight({ text, target }: { text: string; target: string }) {
  const start = text
    .toLocaleLowerCase("en")
    .indexOf(target.toLocaleLowerCase("en"));
  if (start < 0 || !target) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, start + target.length)}</mark>
      {text.slice(start + target.length)}
    </>
  );
}

export default function WordDetails({
  word,
  showTitle = true,
}: {
  word: Word;
  showTitle?: boolean;
}) {
  const examples = word.examples?.length
    ? word.examples
    : [
        {
          id: "legacy",
          context: "In a sentence",
          textEn: word.exampleEn,
          textVi: word.exampleVi,
          targetText: word.headword,
        },
      ];
  const patterns = word.commonPatterns?.length
    ? word.commonPatterns
    : [word.commonPattern];
  return (
    <article className="word-details">
      <header className="word-details-heading">
        <div className="word-metadata">
          <span>{word.itemType?.replaceAll("_", " ") || "Word"}</span>
          <span>·</span>
          <span>{word.partOfSpeech}</span>
          <span
            className="pill"
            title={
              word.cefrStatus === "estimated"
                ? "Estimated learning level for this sense"
                : "Learning level"
            }
          >
            {word.cefrLevel}
            {word.cefrStatus === "estimated" ? " · estimated" : ""}
          </span>
        </div>
        {showTitle && <h2 lang="en">{word.headword}</h2>}
        <p className="word-definition" lang="en">
          {word.meaningEn}
        </p>
        <p className="translation" lang="vi">
          {word.meaningVi}
        </p>
      </header>
      <PronunciationControls word={word} />
      <section className="word-use-section">
        <h3>
          <BookOpen size={18} />
          How to use it
        </h3>
        <div className="pattern-list">
          {patterns.map((p) => (
            <p key={p} lang="en">
              {p}
            </p>
          ))}
        </div>
        <div className="word-examples">
          {examples.map((e) => (
            <blockquote key={e.id}>
              <small className="example-context">{e.context}</small>
              <p lang="en">
                <Highlight text={e.textEn} target={e.targetText} />
              </p>
              <span lang="vi">{e.textVi}</span>
            </blockquote>
          ))}
        </div>
      </section>
      <section className="word-explore">
        <h3>
          <Lightbulb size={18} />
          Explore more
        </h3>
        {word.forms?.length ? (
          <details>
            <summary>
              Word forms
              <ChevronDown size={18} />
            </summary>
            <dl className="word-forms">
              {word.forms.map((f, i) => (
                <div key={i}>
                  <dt>{typeof f === "string" ? "Form" : f.label}</dt>
                  <dd lang="en">{typeof f === "string" ? f : f.text}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}
        {(word.usageNotes || word.usageNotesVi) && (
          <details>
            <summary>
              Usage notes
              <span className="detail-register">{word.register}</span>
              <ChevronDown size={18} />
            </summary>
            {word.usageNotes && <p lang="en">{word.usageNotes}</p>}
            {word.usageNotesVi && (
              <p className="translation" lang="vi">
                {word.usageNotesVi}
              </p>
            )}
          </details>
        )}
        {word.commonMistakes?.length ? (
          <details>
            <summary>
              Common mistakes
              <ChevronDown size={18} />
            </summary>
            {word.commonMistakes.map((m, i) => (
              <div className="word-mistake" key={i}>
                <p className="mistake-wrong" lang="en">
                  <X size={16} />
                  <span>
                    <small>Avoid</small>
                    {m.incorrect}
                  </span>
                </p>
                <p className="mistake-correct" lang="en">
                  <Check size={16} />
                  <span>
                    <small>Use</small>
                    {m.correct}
                  </span>
                </p>
                <p lang="vi">{m.explanationVi}</p>
              </div>
            ))}
          </details>
        ) : null}
        {word.relatedExpressions?.length ? (
          <details>
            <summary>
              Related expressions
              <ChevronDown size={18} />
            </summary>
            <ul className="related-expressions">
              {word.relatedExpressions.map((r) => (
                <li key={r.text}>
                  <div>
                    <b lang="en">{r.text}</b>
                    <small>
                      {r.relation === "contrast" ? "Compare" : r.relation}
                    </small>
                  </div>
                  <p lang="vi">{r.noteVi}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {word.sourceRef && (
          <details className="word-source">
            <summary>
              About this entry
              <ChevronDown size={18} />
            </summary>
            <p>{word.cefrSource}</p>
            <p>{word.sourceRef}</p>
            {word.sourceUrl && (
              <a href={word.sourceUrl} target="_blank" rel="noreferrer">
                Dictionary reference
              </a>
            )}
          </details>
        )}
      </section>
    </article>
  );
}

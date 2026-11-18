import { useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import type { Word } from "../lib/model";

export default function TopicCarousel({ words, onSelect }: {
  words: Word[];
  onSelect: (topic: string) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const counts = new Map<string, number>();
  words.forEach((word) => counts.set(word.topic, (counts.get(word.topic) || 0) + 1));
  const topics = [...counts.entries()];
  const slides = Array.from({ length: Math.ceil(topics.length / 2) }, (_, index) =>
    topics.slice(index * 2, index * 2 + 2));
  if (!slides.length) return null;
  const visibleSlide = Math.min(currentSlide, slides.length - 1);

  const slideTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({
      left: track.scrollLeft + slide.getBoundingClientRect().left - track.getBoundingClientRect().left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const updateSlide = () => {
    const track = trackRef.current;
    if (!track) return;
    const left = track.getBoundingClientRect().left;
    const children = Array.from(track.children) as HTMLElement[];
    const nearest = children.reduce((best, slide, index) =>
      Math.abs(slide.getBoundingClientRect().left - left) <
      Math.abs(children[best].getBoundingClientRect().left - left) ? index : best, 0);
    setCurrentSlide(nearest);
  };

  return <section className="shadow-carousel topic-carousel" aria-label="Explore your topics">
    <div className="shadow-carousel-heading">
      <div><h2>Explore your topics</h2><strong>{visibleSlide + 1} / {slides.length}</strong></div>
      <div className="shadow-carousel-actions">
        <button type="button" aria-label="Previous topics" disabled={visibleSlide === 0}
          onClick={() => slideTo(visibleSlide - 1)}><ChevronLeft size={21} /></button>
        <button type="button" aria-label="Next topics" disabled={visibleSlide === slides.length - 1}
          onClick={() => slideTo(visibleSlide + 1)}><ChevronRight size={21} /></button>
      </div>
    </div>
    <div className="shadow-carousel-track" ref={trackRef} onScroll={updateSlide}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); slideTo(Math.min(visibleSlide + 1, slides.length - 1)); }
        if (event.key === "ArrowLeft") { event.preventDefault(); slideTo(Math.max(visibleSlide - 1, 0)); }
      }}
      role="region" aria-roledescription="carousel" aria-label="Vocabulary topics" tabIndex={0}>
      {slides.map((pair, slideIndex) => <div className="topic-slide" key={pair[0][0]}
        aria-label={`${slideIndex + 1} of ${slides.length}`}>
        {pair.map(([topic, count], pairIndex) => {
          const index = slideIndex * 2 + pairIndex;
          return <button type="button" className="topic-card card" key={topic}
            onClick={() => onSelect(topic)}>
            <span className={`topic-art art-${index}`}>
              {index % 2 ? <BookOpen size={32} /> : <Heart size={32} />}
            </span>
            <h3>{topic}</h3>
            <p>{count} published words</p>
            <ChevronRight size={18} />
          </button>;
        })}
      </div>)}
    </div>
  </section>;
}

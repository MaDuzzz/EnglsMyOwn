import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LearningGroup } from "../lib/model";

type Group = { id: LearningGroup; label: string; count: number };

export default function BatchGroupCarousel({
  groups,
  selected,
  onSelect,
}: {
  groups: Group[];
  selected: LearningGroup;
  onSelect: (group: LearningGroup) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slides = Array.from({ length: Math.ceil(groups.length / 2) }, (_, index) =>
    groups.slice(index * 2, index * 2 + 2),
  );
  const selectedIndex = Math.max(0, groups.findIndex((group) => group.id === selected));
  const [currentSlide, setCurrentSlide] = useState(Math.floor(selectedIndex / 2));
  const visibleSlide = Math.min(currentSlide, Math.max(0, slides.length - 1));
  const selectedGroup = groups[selectedIndex];

  function slideTo(index: number, smooth = true) {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({
      left:
        track.scrollLeft +
        slide.getBoundingClientRect().left -
        track.getBoundingClientRect().left,
      behavior:
        smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
    setCurrentSlide(index);
  }

  useLayoutEffect(() => {
    slideTo(Math.floor(selectedIndex / 2), false);
  }, [selected, groups.map((group) => group.id).join("|")]);

  function updateSlide() {
    const track = trackRef.current;
    if (!track) return;
    const left = track.getBoundingClientRect().left;
    const nearest = Array.from(track.children).reduce((best, item, index, children) =>
      Math.abs(item.getBoundingClientRect().left - left) <
      Math.abs(children[best].getBoundingClientRect().left - left)
        ? index
        : best,
      0,
    );
    setCurrentSlide(nearest);
  }

  return (
    <div className="batch-picker">
      <div className="batch-picker-heading">
        <div>
          <h3>Choose a word group</h3>
          <span>{visibleSlide + 1} / {slides.length}</span>
        </div>
        <div className="shadow-carousel-actions">
          <button
            type="button"
            aria-label="Previous word groups"
            disabled={visibleSlide === 0}
            onClick={() => slideTo(visibleSlide - 1)}
          >
            <ChevronLeft size={21} />
          </button>
          <button
            type="button"
            aria-label="Next word groups"
            disabled={visibleSlide >= slides.length - 1}
            onClick={() => slideTo(visibleSlide + 1)}
          >
            <ChevronRight size={21} />
          </button>
        </div>
      </div>
      <div
        className="batch-group-track"
        ref={trackRef}
        onScroll={updateSlide}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            slideTo(Math.min(visibleSlide + 1, slides.length - 1));
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            slideTo(Math.max(visibleSlide - 1, 0));
          }
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Word groups"
        tabIndex={0}
      >
        {slides.map((pair, index) => (
          <div
            className="batch-group-slide"
            key={pair[0].id}
            role="group"
            aria-label={`${index + 1} of ${slides.length}`}
          >
            {pair.map((group) => (
              <button
                type="button"
                key={group.id}
                aria-pressed={selected === group.id}
                disabled={!group.count}
                onClick={() => onSelect(group.id)}
              >
                <strong>{group.label}</strong>
                <span>{group.count} new</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="batch-picker-selection" aria-live="polite">
        Selected: <strong>{selectedGroup?.label || "Mixed"}</strong> · {selectedGroup?.count || 0} new words
      </p>
    </div>
  );
}

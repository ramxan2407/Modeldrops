import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Talent } from "@/lib/marketing/catalog";
export function TalentPortrait({
  model,
  priority = false,
}: {
  model: Talent;
  priority?: boolean;
}) {
  return (
    <div className="md-talent-portrait" style={{ background: model.color }}>
      <Image
        src={model.image}
        alt={`${model.name} — portrait coming soon`}
        fill
        sizes="(max-width: 700px) 90vw, 40vw"
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
      />
      <span className="md-talent-index">MD / {model.number}</span>
      <span className="md-talent-access">{model.accessType}</span>
    </div>
  );
}
export function TalentCard({
  model,
  priority = false,
}: {
  model: Talent;
  priority?: boolean;
}) {
  return (
    <article className="md-talent-card">
      <Link href={`/models/${model.slug}`} aria-label={`View ${model.name}`}>
        <TalentPortrait model={model} priority={priority} />
        <div className="md-card-name">
          <h3>{model.name}</h3>
          <ArrowUpRight size={23} />
        </div>
        <div className="md-card-meta">
          <span>{model.styles.slice(0, 2).join(" / ")}</span>
          <span>${model.price} planned</span>
        </div>
        <div className="md-card-extra">
          <span>
            {model.gallery.length
              ? `${model.gallery.length} portfolio images`
              : "Portfolio in preparation"}
          </span>
          <span>View model →</span>
        </div>
      </Link>
    </article>
  );
}

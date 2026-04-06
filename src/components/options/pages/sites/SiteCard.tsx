import type { SiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { DeliveryMode, SourceId } from "../../../../lib/shared/types"
import { cn } from "../../../../lib/shared/cn"
import { Card } from "../../../ui"
import { SiteCardHeader } from "./SiteCardHeader"
import { SiteDeliveryModeSection } from "./SiteDeliveryModeSection"
import { SiteNotePanel } from "./SiteNotePanel"
import { SiteScriptFieldsSection } from "./SiteScriptFieldsSection"

type SiteCardProps = {
  site: SiteConfigMeta
  siteIcon: string
  isEnabled: boolean
  isExpanded: boolean
  currentMode: DeliveryMode
  onToggleExpanded: (sourceId: SourceId) => void
  onToggleEnabled: (sourceId: SourceId, enabled: boolean) => void
}

export function SiteCard({
  site,
  siteIcon,
  isEnabled,
  isExpanded,
  currentMode,
  onToggleExpanded,
  onToggleEnabled
}: SiteCardProps) {
  return (
    <article data-testid={`site-card-${site.id}`}>
      <Card
        className={cn(
          "overflow-hidden transition-colors duration-200",
          isEnabled
            ? "border-blue-200 bg-white shadow-sm"
            : "border-zinc-200 bg-zinc-50/60 opacity-75 shadow-none"
        )}>
        <div>
          <SiteCardHeader
            site={site}
            siteIcon={siteIcon}
            isEnabled={isEnabled}
            isExpanded={isExpanded}
            onToggleExpanded={onToggleExpanded}
            onToggleEnabled={onToggleEnabled}
          />

          {isExpanded ? (
            <div className="space-y-6 border-t border-zinc-100 bg-white px-5 py-6">
              <SiteDeliveryModeSection site={site} currentMode={currentMode} />

              {site.hasKisssubScriptFields ? (
                <SiteScriptFieldsSection />
              ) : null}

              <SiteNotePanel site={site} />
            </div>
          ) : null}
        </div>
      </Card>
    </article>
  )
}

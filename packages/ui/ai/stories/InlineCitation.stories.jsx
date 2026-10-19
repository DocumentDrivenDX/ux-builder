import { InlineCitation, InlineCitationCard, InlineCitationCardBody, InlineCitationCardTrigger, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationSource, InlineCitationText } from "../vendor/ai-elements/inline-citation";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/InlineCitation", component: InlineCitation, parameters: { library: "AI Elements", layout: "padded" } };

export const Cited = { render: () => (
  <AiFrame>
    <p>
      The breach was on 3 March 2021{" "}
      <InlineCitation>
        <InlineCitationText>(defence, para 12)</InlineCitationText>
        <InlineCitationCard>
          <InlineCitationCardTrigger sources={["https://example.com/defence"]} />
          <InlineCitationCardBody>
            <InlineCitationCarousel><InlineCitationCarouselContent><InlineCitationCarouselItem>
              <InlineCitationSource title="Defence, 3 October 2026" url="https://example.com/defence" description="Paragraph 12 dates the late delivery." />
            </InlineCitationCarouselItem></InlineCitationCarouselContent></InlineCitationCarousel>
          </InlineCitationCardBody>
        </InlineCitationCard>
      </InlineCitation>.
    </p>
  </AiFrame>
) };

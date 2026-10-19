import { CopyIcon, DownloadIcon } from "lucide-react";
import { Artifact, ArtifactAction, ArtifactActions, ArtifactContent, ArtifactDescription, ArtifactHeader, ArtifactTitle } from "../vendor/ai-elements/artifact";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Artifact", component: Artifact, parameters: { library: "AI Elements", layout: "padded" } };

export const DraftBill = { render: () => (
  <AiFrame>
    <Artifact>
      <ArtifactHeader>
        <div><ArtifactTitle>Draft bill B-1044</ArtifactTitle><ArtifactDescription>Acme v. Beta · October 2026</ArtifactDescription></div>
        <ArtifactActions>
          <ArtifactAction icon={CopyIcon} label="Copy" tooltip="Copy" onClick={() => {}} />
          <ArtifactAction icon={DownloadIcon} label="Download" tooltip="Download" onClick={() => {}} />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent><p>61.5 hours at agreed rates: £12,400, within the cap.</p></ArtifactContent>
    </Artifact>
  </AiFrame>
) };

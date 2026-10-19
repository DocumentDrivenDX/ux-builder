import { Confirmation, ConfirmationAction, ConfirmationActions, ConfirmationRequest, ConfirmationTitle } from "../vendor/ai-elements/confirmation";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Confirmation", component: Confirmation, parameters: { library: "AI Elements", layout: "padded" } };

export const Approval = { render: () => (
  <AiFrame>
    <Confirmation approval={{ id: "bill-b-1044" }} state="approval-requested">
      <ConfirmationTitle><ConfirmationRequest>Create bill B-1044 for Acme v. Beta, £12,400?</ConfirmationRequest></ConfirmationTitle>
      <ConfirmationActions>
        <ConfirmationAction variant="outline" onClick={() => {}}>Deny</ConfirmationAction>
        <ConfirmationAction onClick={() => {}}>Approve</ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  </AiFrame>
) };

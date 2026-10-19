import { TextRoles } from "./TextRoles.jsx";

export default {
  title: "Foundations/Text roles",
  component: TextRoles,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Every text-on-ground pairing the contrast gate checks, rendered as real text. Switch themes in the toolbar and open the Accessibility panel: the failures it lists should be exactly the ones in tools/contrast-baseline.json.",
      },
    },
  },
};

export const AllPairings = {};

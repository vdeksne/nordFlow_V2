import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TopBar } from "./TopBar";

const meta = {
  title: "CRM/TopBar",
  component: TopBar,
  tags: ["autodocs"],
  args: {
    title: "Freelancer desk",
    subtitle:
      "Knock out the top three tasks, then chase money. Everything else is cosplay.",
  },
} satisfies Meta<typeof TopBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NarrowTitle: Story = {
  args: {
    title: "Customer portfolio",
    subtitle: undefined,
  },
};

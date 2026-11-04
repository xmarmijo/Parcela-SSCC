import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});

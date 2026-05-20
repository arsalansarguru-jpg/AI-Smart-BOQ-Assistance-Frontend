import { writeFileSync } from "node:fs";
import { join } from "node:path";

const content = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
`;

writeFileSync(join(process.cwd(), "next-env.d.ts"), content, "utf8");

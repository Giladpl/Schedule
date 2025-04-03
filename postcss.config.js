import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

export default {
  plugins: [tailwindcss, autoprefixer],
  // Only process CSS files
  include: ["**/*.css"],
  exclude: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
};

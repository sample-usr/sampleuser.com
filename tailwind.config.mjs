/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0D0807",
          900: "#211512",
          800: "#5C2B1F",
          700: "#7A5B52",
          600: "#AD8E85",
          500: "#C5AAA0",
          400: "#D4AC9B",
          300: "#EBC2AD",
          200: "#F6DBCB",
          100: "#FDEDDD",
        },
        magenta: {
          100: "#CB868B",
          300: "#B3656C",
          500: "#9A4C52",
          700: "#72373C",
          900: "#432325",
        },
        orange: {
          100: "#FDAB68",
          300: "#F9811F",
          500: "#D66000",
          700: "#AE5104",
          900: "#723503",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

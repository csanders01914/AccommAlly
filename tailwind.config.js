/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Page
                background: "var(--background)",
                foreground: "var(--foreground)",
                // Surfaces
                surface: "var(--surface)",
                "surface-raised": "var(--surface-raised)",
                // Borders
                border: "var(--border)",
                "border-strong": "var(--border-strong)",
                // Text hierarchy
                "text-primary": "var(--text-primary)",
                "text-secondary": "var(--text-secondary)",
                "text-muted": "var(--text-muted)",
                // Primary palette
                primary: {
                    50: "var(--primary-50)",
                    100: "var(--primary-100)",
                    500: "var(--primary-500)",
                    600: "var(--primary-600)",
                    700: "var(--primary-700)",
                },
                // Semantic
                success: "var(--success)",
                warning: "var(--warning)",
                danger: "var(--danger)",
                // Sidebar
                sidebar: "var(--sidebar-background)",
                "sidebar-fg": "var(--sidebar-foreground)",
                // Focus
                "focus-ring": "var(--focus-ring)",
            },
        },
    },
    plugins: [],
};

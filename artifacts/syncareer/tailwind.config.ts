
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				serif: ['Georgia', 'serif'],
				dossier: ['"Literata Variable"', 'Literata', 'Georgia', 'serif'],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
			},
			colors: {
				border: {
					DEFAULT: 'hsl(var(--border))',
					subtle: 'hsl(var(--border-subtle))',
				},
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: {
					DEFAULT: 'hsl(var(--foreground))',
					secondary: 'hsl(var(--foreground-secondary))',
				},
				canvas: 'hsl(var(--canvas))',
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					secondary: 'hsl(var(--surface-secondary))',
					elevated: 'hsl(var(--surface-elevated))',
				},
				selected: {
					DEFAULT: 'hsl(var(--selected))',
					foreground: 'hsl(var(--selected-foreground))',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
				},
				// Brand = the cobalt action colour. Same values as `primary`;
				// the separate name is for chrome and brand marks, so "brand"
				// is never mistaken for "the default button variant".
				brand: {
					DEFAULT: 'hsl(var(--brand))',
					foreground: 'hsl(var(--brand-foreground))',
					hover: 'hsl(var(--brand-hover))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				error: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--error-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				danger: {
					DEFAULT: 'hsl(var(--danger))',
					foreground: 'hsl(var(--danger-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				// Named geometry tokens — prefer these over ad-hoc radii.
				control: 'var(--radius-control)',
				input: 'var(--radius-input)',
				surface: 'var(--radius-surface)',
				'surface-lg': 'var(--radius-surface-lg)',
				overlay: 'var(--radius-overlay)',
				document: 'var(--radius-document)',
				// Badges, avatars, progress bars and status dots only. Never
				// on buttons, inputs, cards or panels.
				pill: 'var(--radius-pill)',
			},
			// Control heights come from tokens so a button, input, select and
			// toggle on the same row are guaranteed to line up.
			height: {
				control: 'var(--control-height)',
				'control-sm': 'var(--control-height-sm)',
				'control-lg': 'var(--control-height-lg)',
			},
			width: {
				control: 'var(--control-height)',
				'control-sm': 'var(--control-height-sm)',
				'control-lg': 'var(--control-height-lg)',
			},
			minHeight: {
				control: 'var(--control-height)',
				touch: 'var(--touch-min)',
			},
			minWidth: {
				touch: 'var(--touch-min)',
			},
			transitionDuration: {
				fast: 'var(--motion-fast)',
				panel: 'var(--motion-panel)',
			},
			// One easing curve. Tailwind's built-in `ease-out` keyword is a
			// different curve, so shared controls use `ease-standard`.
			transitionTimingFunction: {
				standard: 'var(--ease-standard)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				'fade-out': {
					'0%': { opacity: '1' },
					'100%': { opacity: '0' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(8px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-down': {
					'0%': { transform: 'translateY(-8px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				}
			},
			// Overlay/entrance animations run on the same 120–180ms scale and
			// the same curve as control transitions.
			animation: {
				'accordion-down': 'accordion-down var(--motion-base) var(--ease-standard)',
				'accordion-up': 'accordion-up var(--motion-base) var(--ease-standard)',
				'fade-in': 'fade-in var(--motion-base) var(--ease-standard)',
				'fade-out': 'fade-out var(--motion-base) var(--ease-standard)',
				'slide-up': 'slide-up var(--motion-slow) var(--ease-standard)',
				'slide-down': 'slide-down var(--motion-slow) var(--ease-standard)'
			},
			// Minimal, restrained elevation. Content surfaces are flat and
			// bordered; only genuinely elevated things (overlays, dragged
			// items) get a shadow.
			boxShadow: {
				'card': '0 1px 2px 0 rgba(16, 24, 40, 0.05), 0 1px 3px 0 rgba(16, 24, 40, 0.06)',
				'overlay': '0 8px 20px -4px rgba(16, 24, 40, 0.14), 0 2px 6px -2px rgba(16, 24, 40, 0.08)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

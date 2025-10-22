import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Container component for layout structure
 * Provides responsive max-width, padding, and alignment options
 */
const containerVariants = cva("mx-auto w-full", {
	variants: {
		// Maximum width constraints for different content types
		maxWidth: {
			none: "max-w-none",
			sm: "max-w-sm", // 24rem (384px)
			md: "max-w-md", // 28rem (448px)
			lg: "max-w-lg", // 32rem (512px)
			xl: "max-w-xl", // 36rem (576px)
			"2xl": "max-w-2xl", // 42rem (672px)
			"3xl": "max-w-3xl", // 48rem (768px)
			"4xl": "max-w-4xl", // 56rem (896px)
			"5xl": "max-w-5xl", // 64rem (1024px)
			"6xl": "max-w-6xl", // 72rem (1152px)
			"7xl": "max-w-7xl", // 80rem (1280px)
			full: "max-w-full",
		},
		// Horizontal padding
		px: {
			none: "px-0",
			sm: "px-2 sm:px-4",
			md: "px-4 sm:px-6",
			lg: "px-6 sm:px-8",
			xl: "px-8 sm:px-12",
		},
		// Vertical padding
		py: {
			none: "py-0",
			sm: "py-2 sm:py-4",
			md: "py-4 sm:py-6",
			lg: "py-6 sm:py-8",
			xl: "py-8 sm:py-12",
		},
		// Horizontal alignment
		align: {
			left: "mr-auto",
			center: "mx-auto",
			right: "ml-auto",
		},
		// Display type
		as: {
			div: "",
			section: "",
			article: "",
			main: "",
		},
	},
	defaultVariants: {
		maxWidth: "2xl",
		px: "md",
		py: "none",
		align: "center",
	},
});

interface ContainerProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof containerVariants> {
	/**
	 * Render as different HTML element
	 * @default "div"
	 */
	as?: "div" | "section" | "article" | "main";
}

/**
 * Container component for consistent layout spacing and width constraints
 *
 * @example
 * // Basic container with default max-width
 * <Container>Content</Container>
 *
 * @example
 * // Full width container with custom padding
 * <Container maxWidth="full" px="lg" py="md">
 *   Content
 * </Container>
 *
 * @example
 * // Section with constrained width
 * <Container as="section" maxWidth="4xl" px="md">
 *   <h2>Section Title</h2>
 *   Content
 * </Container>
 *
 * @example
 * // Left-aligned container
 * <Container align="left" maxWidth="sm" px="md">
 *   Sidebar content
 * </Container>
 */
function Container({
	className,
	maxWidth,
	px,
	py,
	align,
	as = "div",
	...props
}: ContainerProps) {
	const Component = as as React.ElementType;

	return (
		<Component
			data-slot="container"
			className={cn(
				containerVariants({ maxWidth, px, py, align }),
				className,
			)}
			{...props}
		/>
	);
}

export { Container, containerVariants };

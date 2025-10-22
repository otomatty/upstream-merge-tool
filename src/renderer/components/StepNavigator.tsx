import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Container } from "@/components/ui/container";
import type { ConfigType, MergeResult } from "../../shared/types/ipc";

interface StepNavigatorProps {
	currentStep: "config" | "merge" | "conflict" | "report";
	config: ConfigType | null;
	mergeResult: MergeResult | null;
	onStepChange: (step: "config" | "merge" | "conflict" | "report") => void;
}

interface Step {
	id: "config" | "merge" | "conflict" | "report";
	label: string;
	number: number;
}

const STEPS: Step[] = [
	{ id: "config", label: "設定", number: 1 },
	{ id: "merge", label: "マージ", number: 2 },
	{ id: "conflict", label: "コンフリクト", number: 3 },
	{ id: "report", label: "レポート", number: 4 },
];

export default function StepNavigator({
	currentStep,
	config,
	mergeResult,
	onStepChange,
}: StepNavigatorProps) {
	/**
	 * Check if current step has all required inputs
	 */
	const isCurrentStepValid = (): boolean => {
		switch (currentStep) {
			case "config":
				return config !== null;
			case "merge":
				return config !== null;
			case "conflict":
				return mergeResult !== null && mergeResult.conflictFiles.length > 0;
			case "report":
				return mergeResult !== null;
			default:
				return false;
		}
	};

	/**
	 * Determine if a step is accessible
	 */
	const isStepAccessible = (
		step: "config" | "merge" | "conflict" | "report",
	): boolean => {
		switch (step) {
			case "config":
				return true;
			case "merge":
				return config !== null;
			case "conflict":
				return (
					config !== null &&
					mergeResult !== null &&
					mergeResult.conflictFiles.length > 0
				);
			case "report":
				return mergeResult !== null;
			default:
				return false;
		}
	};

	/**
	 * Get the index of a step
	 */
	const getStepIndex = (
		step: "config" | "merge" | "conflict" | "report",
	): number => {
		return STEPS.findIndex((s) => s.id === step);
	};

	/**
	 * Check if a step is completed
	 */
	const isStepCompleted = (
		step: "config" | "merge" | "conflict" | "report",
	): boolean => {
		const stepIndex = getStepIndex(step);
		const currentIndex = getStepIndex(currentStep);
		return stepIndex < currentIndex;
	};

	/**
	 * Navigate to previous step
	 */
	const handlePreviousStep = () => {
		const currentIndex = getStepIndex(currentStep);
		if (currentIndex > 0) {
			const previousStep = STEPS[currentIndex - 1]?.id;
			if (previousStep && isStepAccessible(previousStep)) {
				onStepChange(previousStep);
			}
		}
	};

	/**
	 * Navigate to next step
	 */
	const handleNextStep = () => {
		if (!isCurrentStepValid()) {
			return;
		}

		const currentIndex = getStepIndex(currentStep);
		if (currentIndex < STEPS.length - 1) {
			const nextStep = STEPS[currentIndex + 1]?.id;
			if (nextStep && isStepAccessible(nextStep)) {
				onStepChange(nextStep);
			}
		}
	};

	/**
	 * Handle step click
	 */
	const handleStepClick = (
		step: "config" | "merge" | "conflict" | "report",
	) => {
		if (isStepAccessible(step)) {
			onStepChange(step);
		}
	};

	const currentIndex = getStepIndex(currentStep);
	const isFirstStep = currentIndex === 0;
	const isLastStep = currentIndex === STEPS.length - 1;

	return (
		<div className="border-t border-border bg-background">
			<Container maxWidth="7xl" px="lg" py="md">
				{/* Steps Container */}
				<div className="flex items-center justify-between mb-6">
					{STEPS.map((step, index) => {
						const isActive = step.id === currentStep;
						const isCompleted = isStepCompleted(step.id);
						const isAccessible = isStepAccessible(step.id);

						return (
							<div key={step.id} className="flex items-center flex-1">
								{/* Step Circle Button */}
								<button
									type="button"
									onClick={() => handleStepClick(step.id)}
									disabled={!isAccessible}
									className={`relative flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all flex-shrink-0 ${
										isActive
											? "bg-primary text-primary-foreground shadow-lg"
											: isCompleted
												? "bg-green-600 text-white hover:bg-green-700"
												: isAccessible
													? "bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
													: "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
									}`}
									title={step.label}
								>
									{isCompleted ? (
										<Check size={18} className="stroke-[3]" />
									) : (
										<span>{step.number}</span>
									)}
								</button>

								{/* Step Label */}
								<div className="ml-3 text-sm">
									<p
										className={`font-semibold ${
											isActive
												? "text-primary"
												: isCompleted
													? "text-green-600"
													: isAccessible
														? "text-foreground"
														: "text-muted-foreground/50"
										}`}
									>
										{step.label}
									</p>
								</div>

								{/* Divider */}
								{index < STEPS.length - 1 && (
									<div className="flex-1 mx-4 h-0.5 bg-border" />
								)}
							</div>
						);
					})}
				</div>

				<Separator className="my-4" />

				{/* Navigation Buttons */}
				<div className="flex items-center justify-between gap-4">
					<Button
						onClick={handlePreviousStep}
						disabled={isFirstStep}
						variant="outline"
						size="sm"
						className="gap-2"
					>
						<ChevronLeft size={18} />
						<span>戻る</span>
					</Button>

					<Button
						onClick={handleNextStep}
						disabled={isLastStep || !isCurrentStepValid()}
						size="sm"
						className="gap-2"
					>
						<span>次へ</span>
						<ChevronRight size={18} />
					</Button>
				</div>
			</Container>
		</div>
	);
}

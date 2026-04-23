export interface DecisionLogicAnswers {
 hasValidMedical: boolean | null;
 restrictsEssentialFunctions: boolean | null;
 isReasonableAccommodation: boolean | null;
}

export type DecisionRecommendation = 'APPROVE' | 'REQUEST_INFO' | 'REVIEW_FOR_DENIAL' | 'PENDING';

/**
 * Deterministic engine for suggesting an accommodation status
 * based on standard compliance logic points.
 */
export function calculateDecisionSuggestion(answers: DecisionLogicAnswers): DecisionRecommendation {
 const { hasValidMedical, restrictsEssentialFunctions, isReasonableAccommodation } = answers;

 // If they haven't answered everything yet, we don't have enough data
 if (hasValidMedical === null || restrictsEssentialFunctions === null || isReasonableAccommodation === null) {
 return 'PENDING';
 }

 if (!hasValidMedical) {
 return 'REQUEST_INFO';
 }

 if (hasValidMedical && restrictsEssentialFunctions && isReasonableAccommodation) {
 return 'APPROVE';
 }

 if (!isReasonableAccommodation) {
 return 'REVIEW_FOR_DENIAL';
 }

 return 'REVIEW_FOR_DENIAL';
}

import { computed, type Ref, type ComputedRef } from 'vue'
import type { PartSubmissionHistory, SubmissionAttempt } from './useStudentSubmissionHistory'

// Extended attempt with penalty information
export interface PenalizedAttempt extends SubmissionAttempt {
    adjustedScore?: number
    originalScore?: number
    isLate?: boolean
    latePenaltyPercent?: number
    bestScoreBeforeDue?: number
    penalizedImprovement?: number
}

// Extended part with penalty information
export interface PenalizedPartHistory {
    partId: string
    partOrder?: number
    partTitle?: string
    submissionHistory: PenalizedAttempt[]
    isPartCompleted: boolean
    bestScore: number
}

// Lab configuration for penalty calculation
export interface LabPenaltyConfig {
    dueDate?: string | Date | null
    availableUntil?: string | Date | null
    latePenaltyPercent?: number
}

// Stats result
export interface SubmissionStats {
    totalAttempts: number
    passedAttempts: number
    partsCompleted: number
    totalParts: number
    totalScore: number
    totalPossiblePoints: number
    progressPercentage?: number
}

/**
 * Apply incremental late penalty to submission history
 * Formula: (currentScore - bestBeforeDue) × penaltyMultiplier + bestBeforeDue
 */
export function applyLatePenalty(
    submissionHistory: PartSubmissionHistory[],
    config: LabPenaltyConfig
): PenalizedPartHistory[] {
    if (!submissionHistory || submissionHistory.length === 0) {
        return []
    }

    const dueDate = config.dueDate ? new Date(config.dueDate) : null
    const availableUntil = config.availableUntil ? new Date(config.availableUntil) : null
    const latePenaltyPercent = config.latePenaltyPercent ?? 50

    return submissionHistory.map(part => {
        // Find best score before due date
        let bestScoreBeforeDue = 0
        if (dueDate) {
            part.submissionHistory.forEach(attempt => {
                if (attempt.status !== 'completed' || !attempt.submittedAt) return
                const submittedDate = new Date(attempt.submittedAt)
                if (submittedDate <= dueDate) {
                    const score = attempt.score ?? 0
                    if (score > bestScoreBeforeDue) {
                        bestScoreBeforeDue = score
                    }
                }
            })
        }

        // Track part-level stats
        let bestScore = 0
        let isPartCompleted = false

        // Recalculate adjusted scores
        const updatedHistory: PenalizedAttempt[] = part.submissionHistory.map(attempt => {
            // Track completion status
            if (attempt.status === 'completed' && attempt.score === attempt.totalPoints) {
                isPartCompleted = true
            }

            if (attempt.status !== 'completed' || !attempt.submittedAt) {
                return attempt as PenalizedAttempt
            }

            const submittedDate = new Date(attempt.submittedAt)
            const isLate = dueDate && submittedDate > dueDate && (!availableUntil || submittedDate <= availableUntil)

            if (!isLate) {
                const score = attempt.score ?? 0
                if (score > bestScore) bestScore = score
                return {
                    ...attempt,
                    adjustedScore: attempt.score,
                    isLate: false
                }
            }

            // Apply incremental penalty formula
            const effectivePenalty = Math.max(0, Math.min(100, latePenaltyPercent))
            const penaltyMultiplier = (100 - effectivePenalty) / 100
            const currentScore = attempt.score ?? 0
            const incrementalScore = Math.max(0, currentScore - bestScoreBeforeDue)
            const penalizedIncrement = incrementalScore * penaltyMultiplier
            const adjustedScore = Math.round((bestScoreBeforeDue + penalizedIncrement) * 100) / 100

            if (adjustedScore > bestScore) bestScore = adjustedScore

            return {
                ...attempt,
                adjustedScore,
                originalScore: currentScore,
                isLate: true,
                latePenaltyPercent: effectivePenalty,
                bestScoreBeforeDue,
                penalizedImprovement: Math.round(penalizedIncrement * 100) / 100
            }
        })

        return {
            partId: part.partId,
            partOrder: part.partOrder,
            partTitle: part.partTitle,
            submissionHistory: updatedHistory,
            isPartCompleted,
            bestScore
        }
    })
}

/**
 * Calculate submission statistics from penalized history
 */
export function calculateStats(
    penalizedHistory: PenalizedPartHistory[],
    totalPossiblePoints?: number
): SubmissionStats {
    const result = penalizedHistory.reduce((acc, part) => {
        const passedCount = part.isPartCompleted
            ? part.submissionHistory.filter(a => a.status === 'completed' && a.score === a.totalPoints).length
            : 0

        return {
            totalAttempts: acc.totalAttempts + part.submissionHistory.length,
            passedAttempts: acc.passedAttempts + passedCount,
            partsCompleted: acc.partsCompleted + (part.isPartCompleted ? 1 : 0),
            totalScore: acc.totalScore + part.bestScore
        }
    }, { totalAttempts: 0, passedAttempts: 0, partsCompleted: 0, totalScore: 0 })

    // Calculate total possible points from submissions if not provided
    const possiblePoints = totalPossiblePoints ?? penalizedHistory.reduce((sum, part) => {
        const maxPoints = part.submissionHistory[0]?.totalPoints || 0
        return sum + maxPoints
    }, 0)

    const progressPercentage = possiblePoints > 0 ? (result.totalScore / possiblePoints) * 100 : 0

    return {
        ...result,
        totalParts: penalizedHistory.length,
        totalScore: Math.round(result.totalScore * 100) / 100,
        totalPossiblePoints: possiblePoints,
        progressPercentage: Math.round(progressPercentage)
    }
}

/**
 * Composable for late penalty calculations
 */
export function useLatePenaltyCalculation(
    submissionHistory: Ref<PartSubmissionHistory[]>,
    labConfig: ComputedRef<LabPenaltyConfig>
) {
    const penalizedHistory = computed<PenalizedPartHistory[]>(() => {
        return applyLatePenalty(submissionHistory.value, labConfig.value)
    })

    const stats = computed(() => {
        return calculateStats(penalizedHistory.value)
    })

    return {
        penalizedHistory,
        stats
    }
}

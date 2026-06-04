/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface AnalysisData {
  relationship: number; // 0-100
  culture: number;      // 0-100
  capability: number;   // 0-100
  psychology: number;   // 0-100
  emotion: string;      // 대표 감정
  shortDiagnosis: string; // 한줄진단
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  analysis?: AnalysisData;
}

export interface DiagnosisQuestion {
  id: number;
  axis: 'relationship' | 'culture' | 'capability' | 'psychology';
  text: string;
  options: {
    text: string;
    score: number;
  }[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number; // 정답 인덱스
  explanation: string;
  lawProvision: string; // 관련 근로기준법 조항
}

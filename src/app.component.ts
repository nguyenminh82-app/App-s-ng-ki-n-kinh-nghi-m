
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InputFormComponent } from './components/input-form/input-form.component';
import { ResultsComponent } from './components/results/results.component';
import { KnowledgeBaseComponent } from './components/knowledge-base/knowledge-base.component';
import { GeminiService, AnalysisResult } from './services/gemini.service';

type Page = 'input' | 'results' | 'knowledge-base';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InputFormComponent, ResultsComponent, KnowledgeBaseComponent],
})
export class AppComponent {
  currentPage = signal<Page>('input');
  isLoading = signal(false);
  error = signal<string | null>(null);
  analysisResult = signal<AnalysisResult | null>(null);
  originalFileName = signal<string | null>(null);
  selectedField = signal('mamnon');
  
  constructor(private geminiService: GeminiService) {}

  async onAnalyzeRequest(event: { content: string; rubric: any; fileName: string | null; field: string; }) {
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPage.set('input');
    this.originalFileName.set(event.fileName);
    this.selectedField.set(event.field);
    
    try {
      const result = await this.geminiService.analyzeSKKN(event.content, event.rubric, event.field);
      this.analysisResult.set(result);
      this.currentPage.set('results');
    } catch (e) {
      console.error(e);
      this.error.set('Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateTo(page: Page) {
    this.currentPage.set(page);
  }
}

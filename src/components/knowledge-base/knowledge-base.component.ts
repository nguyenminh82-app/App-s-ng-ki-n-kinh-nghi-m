
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'lesson-plan' | 'strategy' | 'assessment';
  subject: string;
  gradeLevel: string;
  pedagogicalApproach: string;
  tags: string[];
  author: string;
  uploadDate: string;
  fileUrl?: string;
}

@Component({
  selector: 'app-knowledge-base',
  templateUrl: './knowledge-base.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
})
export class KnowledgeBaseComponent implements OnInit {
  private http = inject(HttpClient);

  resources = signal<Resource[]>([]);
  isLoading = signal(false);
  showUploadModal = signal(false);

  // Filters
  searchQuery = signal('');
  selectedCategory = signal('');
  selectedSubject = signal('');
  selectedGrade = signal('');

  // Form data for upload
  newResource = {
    title: '',
    description: '',
    category: 'lesson-plan',
    subject: '',
    gradeLevel: '',
    pedagogicalApproach: '',
    tags: '',
    author: ''
  };
  selectedFile: File | null = null;

  ngOnInit() {
    this.fetchResources();
  }

  async fetchResources() {
    this.isLoading.set(true);
    const params: any = {};
    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.selectedCategory()) params.category = this.selectedCategory();
    if (this.selectedSubject()) params.subject = this.selectedSubject();
    if (this.selectedGrade()) params.gradeLevel = this.selectedGrade();

    try {
      const data = await this.http.get<Resource[]>('/api/resources', { params }).toPromise();
      this.resources.set(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async uploadResource() {
    if (!this.newResource.title || !this.newResource.author) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    const formData = new FormData();
    Object.entries(this.newResource).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    try {
      await this.http.post('/api/resources', formData).toPromise();
      this.showUploadModal.set(false);
      this.fetchResources();
      // Reset form
      this.newResource = {
        title: '',
        description: '',
        category: 'lesson-plan',
        subject: '',
        gradeLevel: '',
        pedagogicalApproach: '',
        tags: '',
        author: ''
      };
      this.selectedFile = null;
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert('Đã xảy ra lỗi khi tải lên.');
    }
  }

  getCategoryLabel(category: string) {
    switch (category) {
      case 'lesson-plan': return 'Kế hoạch bài dạy';
      case 'strategy': return 'Chiến lược dạy học';
      case 'assessment': return 'Ví dụ đánh giá';
      default: return category;
    }
  }
}

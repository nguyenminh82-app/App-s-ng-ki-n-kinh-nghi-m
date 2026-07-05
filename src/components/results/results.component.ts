
import { Component, ChangeDetectionStrategy, input, AfterViewInit, ElementRef, viewChild, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../services/gemini.service';
import { ExportService } from '../../services/export.service';

declare var Chart: any;

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [ExportService],
})
export class ResultsComponent implements AfterViewInit, OnChanges {
  result = input.required<AnalysisResult>();
  originalFileName = input<string | null>(null);
  field = input<string>('mamnon');

  radarChartRef = viewChild<ElementRef>('radarChart');
  private chartInstance: any;
  
  readonly fieldDescription = computed(() => {
    const fieldMap: { [key: string]: string } = {
        'mamnon': 'Mầm non',
        'tieuhoc': 'Tiểu học',
        'thcs': 'THCS',
        'thpt': 'THPT'
    };
    const persona = fieldMap[this.field()] || 'Chung';
    return `Góc nhìn và phân tích chi tiết từ Giám khảo AI chuyên ngành ${persona}.`;
  });

  constructor(private exportService: ExportService) {}

  ngAfterViewInit(): void {
    this.createChart();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result'] && !changes['result'].firstChange) {
      this.updateChart();
    }
  }

  getRatingClass(rating: string): string {
    switch (rating.toLowerCase()) {
      case 'xuất sắc':
      case 'tốt':
        return 'bg-green-100 text-green-800';
      case 'khá':
        return 'bg-blue-100 text-blue-800';
      case 'đạt':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  }

  private createChart(): void {
    if (!this.radarChartRef() || !this.result()?.bangTieuChi) return;
    const ctx = this.radarChartRef()?.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.prepareChartData();

    this.chartInstance = new Chart(ctx, {
      type: 'radar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100, // Normalized to 100 for percentage view
            pointLabels: {
              font: {
                size: 12
              }
            },
            ticks: {
              backdropColor: 'transparent',
              stepSize: 20
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.r !== null) {
                  label += context.parsed.r.toFixed(2) + '%';
                }
                return label;
              }
            }
          }
        }
      }
    });
  }
  
  private updateChart(): void {
    if (this.chartInstance) {
      const data = this.prepareChartData();
      this.chartInstance.data.labels = data.labels;
      this.chartInstance.data.datasets[0].data = data.datasets[0].data;
      this.chartInstance.update();
    } else {
        this.createChart();
    }
  }
  
  private prepareChartData() {
    const labels = this.result().bangTieuChi.map(item => item.tieuChi.replace(/ \(.*/, '')); // Shorten labels for chart
    const data = this.result().bangTieuChi.map(item => (item.diemDat / item.diemToiDa) * 100);
    
    return {
      labels: labels,
      datasets: [{
        label: 'Tỷ lệ điểm đạt (%)',
        data: data,
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
      }]
    };
  }
  
  exportResults(): void {
      this.exportService.exportToDocx(this.result(), this.originalFileName());
  }
}

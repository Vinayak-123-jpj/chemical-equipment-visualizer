import sys
import requests
import pandas as pd
import csv
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTabWidget,
    QPushButton, QFileDialog, QLabel, QFrame, QGridLayout,
    QTableWidget, QTableWidgetItem, QLineEdit, QComboBox,
    QMessageBox, QHeaderView
)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont, QColor
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.pyplot as plt


class StatCard(QFrame):
    """Custom widget for displaying statistics"""
    def __init__(self, icon, label, value, unit="", color="#667eea", parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.StyledPanel)
        self.setStyleSheet(f"""
            StatCard {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #f8fafc, stop:1 #e2e8f0);
                border-left: 5px solid {color};
                border-radius: 12px;
                padding: 20px;
            }}
            StatCard:hover {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #e2e8f0, stop:1 #cbd5e1);
            }}
        """)
        
        layout = QHBoxLayout()
        layout.setSpacing(15)
        
        # Icon
        icon_label = QLabel(icon)
        icon_label.setStyleSheet("font-size: 36px;")
        
        # Content
        content_layout = QVBoxLayout()
        content_layout.setSpacing(5)
        
        # Label
        label_widget = QLabel(label)
        label_widget.setStyleSheet("""
            color: #64748b;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        """)
        
        # Value
        self.value_widget = QLabel(value)
        self.value_widget.setStyleSheet("""
            color: #1e293b;
            font-size: 28px;
            font-weight: bold;
        """)
        
        # Unit
        if unit:
            unit_widget = QLabel(unit)
            unit_widget.setStyleSheet("""
                color: #94a3b8;
                font-size: 13px;
                font-weight: 500;
            """)
            content_layout.addWidget(unit_widget)
        
        content_layout.addWidget(label_widget)
        content_layout.addWidget(self.value_widget)
        
        layout.addWidget(icon_label)
        layout.addLayout(content_layout)
        
        self.setLayout(layout)
    
    def update_value(self, value):
        self.value_widget.setText(value)


class App(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Chemical Equipment Visualizer - Advanced")
        self.setMinimumSize(1100, 800)
        self.raw_data = []
        
        # Set modern color scheme
        self.setStyleSheet("""
            QWidget {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #667eea, stop:1 #764ba2);
                font-family: 'Segoe UI', Arial, sans-serif;
            }
            QTabWidget::pane {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 5px;
            }
            QTabBar::tab {
                background: rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 24px;
                margin-right: 5px;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                font-weight: bold;
            }
            QTabBar::tab:selected {
                background: rgba(255, 255, 255, 0.95);
                color: #1e293b;
            }
            QTabBar::tab:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        """)
        
        # Main layout
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(30, 30, 30, 30)
        main_layout.setSpacing(20)
        
        # Title
        title = QLabel("⚗️ Chemical Equipment Parameter Visualizer")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("""
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px;
            letter-spacing: -0.5px;
        """)
        subtitle = QLabel("Advanced Analytics & Real-time Monitoring")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("""
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            padding-bottom: 10px;
        """)
        main_layout.addWidget(title)
        main_layout.addWidget(subtitle)
        
        # Upload Section
        upload_frame = QFrame()
        upload_frame.setStyleSheet("""
            QFrame {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 20px;
            }
        """)
        upload_layout = QHBoxLayout()
        
        self.label = QLabel("📂 Upload CSV Data File")
        self.label.setStyleSheet("""
            color: #4f46e5;
            font-size: 16px;
            font-weight: bold;
            padding: 10px;
        """)
        upload_layout.addWidget(self.label)
        
        self.button = QPushButton("Choose CSV File")
        self.button.clicked.connect(self.upload_file)
        self.button.setCursor(Qt.PointingHandCursor)
        self.button.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #667eea, stop:1 #764ba2);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 30px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #5568d3, stop:1 #653a8b);
            }
        """)
        upload_layout.addWidget(self.button)
        
        # Export buttons
        self.export_csv_btn = QPushButton("📊 Export CSV")
        self.export_csv_btn.clicked.connect(self.export_csv)
        self.export_csv_btn.setEnabled(False)
        self.export_csv_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #10b981, stop:1 #059669);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 15px 25px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover:enabled {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #059669, stop:1 #047857);
            }
            QPushButton:disabled {
                background: #94a3b8;
                color: #cbd5e1;
            }
        """)
        upload_layout.addWidget(self.export_csv_btn)
        
        self.file_name_label = QLabel("")
        self.file_name_label.setAlignment(Qt.AlignCenter)
        self.file_name_label.setStyleSheet("""
            color: #10b981;
            font-size: 12px;
            font-weight: bold;
            background: rgba(16, 185, 129, 0.1);
            padding: 8px 16px;
            border-radius: 8px;
        """)
        upload_layout.addWidget(self.file_name_label)
        
        upload_frame.setLayout(upload_layout)
        main_layout.addWidget(upload_frame)
        
        # Tab Widget
        self.tabs = QTabWidget()
        
        # Tab 1: Dashboard
        dashboard_tab = QWidget()
        dashboard_layout = QVBoxLayout()
        
        # Stats Grid
        stats_frame = QFrame()
        stats_frame.setStyleSheet("background: transparent;")
        stats_layout = QGridLayout()
        stats_layout.setSpacing(15)
        
        self.stat_cards = {
            'records': StatCard("📝", "Total Records", "-", "", "#667eea"),
            'flowrate': StatCard("💧", "Avg Flowrate", "-", "L/min", "#4facfe"),
            'pressure': StatCard("⚡", "Avg Pressure", "-", "bar", "#fee140"),
            'temperature': StatCard("🌡️", "Avg Temperature", "-", "°C", "#fa709a"),
        }
        
        stats_layout.addWidget(self.stat_cards['records'], 0, 0)
        stats_layout.addWidget(self.stat_cards['flowrate'], 0, 1)
        stats_layout.addWidget(self.stat_cards['pressure'], 1, 0)
        stats_layout.addWidget(self.stat_cards['temperature'], 1, 1)
        
        stats_frame.setLayout(stats_layout)
        dashboard_layout.addWidget(stats_frame)
        
        # Chart Section
        chart_frame = QFrame()
        chart_frame.setStyleSheet("""
            QFrame {
                background: white;
                border-radius: 15px;
                padding: 20px;
            }
        """)
        chart_layout = QVBoxLayout()
        
        chart_header = QHBoxLayout()
        chart_title = QLabel("📈 Equipment Distribution")
        chart_title.setStyleSheet("""
            color: #1e293b;
            font-size: 18px;
            font-weight: bold;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        """)
        chart_header.addWidget(chart_title)
        chart_header.addStretch()
        
        # Chart type selector
        self.chart_type = QComboBox()
        self.chart_type.addItems(["📊 Bar Chart", "📈 Line Chart", "🥧 Pie Chart"])
        self.chart_type.currentIndexChanged.connect(self.update_chart_type)
        self.chart_type.setStyleSheet("""
            QComboBox {
                padding: 8px 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                font-weight: bold;
                min-width: 120px;
            }
            QComboBox:hover {
                border-color: #667eea;
            }
            QComboBox::drop-down {
                border: none;
            }
        """)
        chart_header.addWidget(self.chart_type)
        
        chart_layout.addLayout(chart_header)
        
        self.figure = Figure(facecolor='white')
        self.canvas = FigureCanvas(self.figure)
        chart_layout.addWidget(self.canvas)
        
        chart_frame.setLayout(chart_layout)
        dashboard_layout.addWidget(chart_frame)
        
        dashboard_tab.setLayout(dashboard_layout)
        
        # Tab 2: Equipment Details
        details_tab = QWidget()
        details_layout = QVBoxLayout()
        
        # Filter controls
        filter_frame = QFrame()
        filter_frame.setStyleSheet("""
            QFrame {
                background: white;
                border-radius: 10px;
                padding: 15px;
            }
        """)
        filter_layout = QHBoxLayout()
        
        search_label = QLabel("🔍 Search:")
        search_label.setStyleSheet("color: #1e293b; font-weight: bold;")
        filter_layout.addWidget(search_label)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search equipment name or type...")
        self.search_input.textChanged.connect(self.filter_table)
        self.search_input.setStyleSheet("""
            QLineEdit {
                padding: 10px 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border-color: #667eea;
            }
        """)
        filter_layout.addWidget(self.search_input, 1)
        
        sort_label = QLabel("Sort by:")
        sort_label.setStyleSheet("color: #1e293b; font-weight: bold;")
        filter_layout.addWidget(sort_label)
        
        self.sort_combo = QComboBox()
        self.sort_combo.addItems(["Name", "Type", "Flowrate", "Pressure", "Temperature"])
        self.sort_combo.currentIndexChanged.connect(self.sort_table)
        self.sort_combo.setStyleSheet("""
            QComboBox {
                padding: 8px 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                font-weight: bold;
                min-width: 120px;
            }
        """)
        filter_layout.addWidget(self.sort_combo)
        
        filter_frame.setLayout(filter_layout)
        details_layout.addWidget(filter_frame)
        
        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["Equipment Name", "Type", "Flowrate", "Pressure", "Temperature", "Status"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setStyleSheet("""
            QTableWidget {
                background: white;
                border-radius: 10px;
                border: none;
                gridline-color: #e2e8f0;
            }
            QTableWidget::item {
                padding: 10px;
                color: #1e293b;
            }
            QTableWidget::item:selected {
                background: rgba(102, 126, 234, 0.2);
            }
            QHeaderView::section {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #667eea, stop:1 #764ba2);
                color: white;
                padding: 12px;
                border: none;
                font-weight: bold;
                font-size: 12px;
            }
        """)
        details_layout.addWidget(self.table)
        
        details_tab.setLayout(details_layout)
        
        self.tabs.addTab(dashboard_tab, "📊 Dashboard")
        self.tabs.addTab(details_tab, "🔍 Equipment Details")
        
        main_layout.addWidget(self.tabs)
        
        self.setLayout(main_layout)
        self.current_data = None

    def upload_file(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open CSV", "", "CSV Files (*.csv)"
        )

        if not file_path:
            return

        import os
        self.file_name_label.setText(f"✓ {os.path.basename(file_path)}")

        try:
            # Read CSV for table
            with open(file_path, 'r') as f:
                reader = csv.DictReader(f)
                self.raw_data = list(reader)
            
            # Upload to server
            files = {"file": open(file_path, "rb")}
            response = requests.post(
                "http://127.0.0.1:8000/api/upload/",
                files=files,
                auth=("vinayak", "test@1234")
            )

            data = response.json()
            self.current_data = data

            # Update stat cards
            self.stat_cards['records'].update_value(str(data['total_records']))
            self.stat_cards['flowrate'].update_value(f"{data['avg_flowrate']:.2f}")
            self.stat_cards['pressure'].update_value(f"{data['avg_pressure']:.2f}")
            self.stat_cards['temperature'].update_value(f"{data['avg_temperature']:.2f}")

            # Update chart
            self.update_chart(data)
            
            # Populate table
            self.populate_table()
            
            # Enable export
            self.export_csv_btn.setEnabled(True)
            
            QMessageBox.information(self, "Success", "Data uploaded and analyzed successfully!")
            
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to upload file:\n{str(e)}")
            self.file_name_label.setText(f"❌ Error: {str(e)}")
            self.file_name_label.setStyleSheet("color: #ef4444; font-size: 12px; padding: 5px;")

    def update_chart(self, data):
        self.figure.clear()
        ax = self.figure.add_subplot(111)
        
        colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0']
        
        labels = list(data["type_distribution"].keys())
        values = list(data["type_distribution"].values())
        
        chart_idx = self.chart_type.currentIndex()
        
        if chart_idx == 0:  # Bar
            bars = ax.bar(labels, values, color=colors[:len(labels)], edgecolor='white', linewidth=2, alpha=0.9)
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height, f'{int(height)}',
                       ha='center', va='bottom', fontweight='bold', color='#1e293b', fontsize=10)
        elif chart_idx == 1:  # Line
            ax.plot(labels, values, marker='o', linewidth=3, markersize=10, color='#667eea')
            ax.fill_between(range(len(labels)), values, alpha=0.3, color='#667eea')
            for i, v in enumerate(values):
                ax.text(i, v, f'{int(v)}', ha='center', va='bottom', fontweight='bold')
        else:  # Pie
            ax.pie(values, labels=labels, colors=colors[:len(labels)], autopct='%1.1f%%',
                  startangle=90, textprops={'fontweight': 'bold', 'color': 'white'})
        
        ax.set_xlabel('Equipment Type', fontsize=12, fontweight='bold', color='#1e293b')
        ax.set_ylabel('Count', fontsize=12, fontweight='bold', color='#1e293b')
        ax.set_title('Equipment Distribution', fontsize=14, fontweight='bold', color='#1e293b', pad=20)
        
        if chart_idx != 2:
            ax.grid(axis='y', alpha=0.3, linestyle='--', linewidth=0.5)
            ax.set_axisbelow(True)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
        
        self.figure.tight_layout()
        self.canvas.draw()
    
    def update_chart_type(self):
        if self.current_data:
            self.update_chart(self.current_data)
    
    def populate_table(self):
        self.table.setRowCount(len(self.raw_data))
        
        for row, item in enumerate(self.raw_data):
            self.table.setItem(row, 0, QTableWidgetItem(item.get('Equipment Name', '')))
            self.table.setItem(row, 1, QTableWidgetItem(item.get('Type', '')))
            
            flowrate = float(item.get('Flowrate', 0))
            pressure = float(item.get('Pressure', 0))
            temperature = float(item.get('Temperature', 0))
            
            self.table.setItem(row, 2, QTableWidgetItem(f"{flowrate:.2f}"))
            self.table.setItem(row, 3, QTableWidgetItem(f"{pressure:.2f}"))
            self.table.setItem(row, 4, QTableWidgetItem(f"{temperature:.2f}"))
            
            # Status
            status = self.get_status(flowrate, pressure, temperature)
            status_item = QTableWidgetItem(status)
            
            if status == "NORMAL":
                status_item.setBackground(QColor(16, 185, 129, 50))
                status_item.setForeground(QColor(5, 150, 105))
            elif status == "HIGH":
                status_item.setBackground(QColor(250, 112, 154, 50))
                status_item.setForeground(QColor(225, 89, 129))
            else:
                status_item.setBackground(QColor(254, 225, 64, 50))
                status_item.setForeground(QColor(229, 202, 39))
            
            status_item.setFont(QFont("Segoe UI", 9, QFont.Bold))
            self.table.setItem(row, 5, status_item)
    
    def get_status(self, flowrate, pressure, temperature):
        if flowrate < 80 or pressure < 4 or temperature < 100:
            return "LOW"
        if flowrate > 150 or pressure > 8 or temperature > 135:
            return "HIGH"
        return "NORMAL"
    
    def filter_table(self):
        search_text = self.search_input.text().lower()
        
        for row in range(self.table.rowCount()):
            should_show = False
            for col in range(2):  # Search in name and type columns
                item = self.table.item(row, col)
                if item and search_text in item.text().lower():
                    should_show = True
                    break
            self.table.setRowHidden(row, not should_show)
    
    def sort_table(self):
        col_map = {"Name": 0, "Type": 1, "Flowrate": 2, "Pressure": 3, "Temperature": 4}
        col = col_map.get(self.sort_combo.currentText(), 0)
        self.table.sortItems(col, Qt.DescendingOrder if col > 1 else Qt.AscendingOrder)
    
    def export_csv(self):
        if not self.current_data:
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export CSV", "equipment_summary.csv", "CSV Files (*.csv)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Metric", "Value"])
                    writer.writerow(["Total Records", self.current_data['total_records']])
                    writer.writerow(["Average Flowrate", f"{self.current_data['avg_flowrate']:.2f}"])
                    writer.writerow(["Average Pressure", f"{self.current_data['avg_pressure']:.2f}"])
                    writer.writerow(["Average Temperature", f"{self.current_data['avg_temperature']:.2f}"])
                    writer.writerow([])
                    writer.writerow(["Equipment Type", "Count"])
                    for eq_type, count in self.current_data['type_distribution'].items():
                        writer.writerow([eq_type, count])
                
                QMessageBox.information(self, "Success", f"Data exported to:\n{file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to export:\n{str(e)}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Set application-wide font
    font = QFont("Segoe UI", 10)
    app.setFont(font)
    
    window = App()
    window.show()
    sys.exit(app.exec_())
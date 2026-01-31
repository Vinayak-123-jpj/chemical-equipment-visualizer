import sys
import requests
import pandas as pd
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout,
    QPushButton, QFileDialog, QLabel
)
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure


class App(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Chemical Equipment Visualizer (Desktop)")
        self.resize(700, 600)

        layout = QVBoxLayout()

        self.label = QLabel("Upload CSV File")
        layout.addWidget(self.label)

        self.button = QPushButton("Choose CSV File")
        self.button.clicked.connect(self.upload_file)
        layout.addWidget(self.button)

        self.result = QLabel("")
        layout.addWidget(self.result)

        self.figure = Figure()
        self.canvas = FigureCanvas(self.figure)
        layout.addWidget(self.canvas)

        self.setLayout(layout)

    def upload_file(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open CSV", "", "CSV Files (*.csv)"
        )

        if not file_path:
            return

        files = {"file": open(file_path, "rb")}
        response = requests.post(
            "http://127.0.0.1:8000/api/upload/", files=files
        )

        data = response.json()

        self.result.setText(
            f"""
Total Records: {data['total_records']}
Avg Flowrate: {data['avg_flowrate']:.2f}
Avg Pressure: {data['avg_pressure']:.2f}
Avg Temperature: {data['avg_temperature']:.2f}
"""
        )

        self.figure.clear()
        ax = self.figure.add_subplot(111)
        ax.bar(
            data["type_distribution"].keys(),
            data["type_distribution"].values()
        )
        ax.set_title("Equipment Count")
        self.canvas.draw()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = App()
    window.show()
    sys.exit(app.exec_())

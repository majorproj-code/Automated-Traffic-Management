import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  Activity,
  Radio,
  Cpu,
  Car,
  Cloud,
  Wifi,
  TrafficCone
} from "lucide-react";

import "./App.css";

function App() {

  const [images, setImages] = useState(
    Array(5).fill(null)
  );

  const [analyzing, setAnalyzing] = useState(false);

  const [results, setResults] = useState(null);

  const [error, setError] = useState("");

  const roads = [
    "Road 1",
    "Road 2",
    "Road 3",
    "Road 4",
    "Road 5"
  ];

  const handleImageUpload = (event, index) => {

    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image.");
      return;
    }

    setError("");

    const updated = [...images];

    updated[index] = {
      file,
      preview: URL.createObjectURL(file)
    };

    setImages(updated);
    setResults(null);
  };

  const analyzeTraffic = async () => {

    if (images.some(image => !image)) {
      setError("Please upload all five road photographs.");
      return;
    }

    setAnalyzing(true);
    setError("");

    try {

      const formData = new FormData();

      images.forEach((image, index) => {
        formData.append(
          "files",
          image.file,
          `road${index + 1}.jpg`
        );
      });

      const response = await fetch(
        "https://anti-eden-virtue-boss.trycloudflare.com/api/analyze",
        // "http://127.0.0.1:8000/api/analyze",
        {
          method: "POST",
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error("Backend analysis failed.");
      }
      else {
        console.log("Done");
      }

      const data = await response.json();

      setResults(data);

    } catch (err) {

      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to FastAPI. Please start the backend."
          : err.message
      );

    } finally {

      setAnalyzing(false);

    }
  };

  const vehicleCounts = results?.vehicle_counts || {};

  const selectedRoad = results?.selected_road;

  const signals = roads.map((road, index) => {

    const roadKey = `road${index + 1}`;

    return {
      road,
      count: vehicleCounts[roadKey] ?? 0,
      signal:
        selectedRoad === roadKey ? "GREEN" : "RED"
    };

  });

  return (

    <div className="dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <TrafficCone size={32} />
          <h2>SmartTraffic AI</h2>
        </div>

        <div className="menu-title">
          MAIN MENU
        </div>

        <div className="menu active">
          <LayoutDashboard />
          Dashboard
        </div>

        <div className="menu">
          <Upload />
          Image Upload
        </div>

        <div className="menu">
          <Activity />
          Traffic Analysis
        </div>

        <div className="menu">
          <Radio />
          Signal Monitoring
        </div>

        <div className="menu-title">
          SYSTEM
        </div>

        <div className="menu">
          <Cpu />
          IoT Controller
        </div>

        <div className="menu">
          <Cloud />
          Firebase
        </div>

        <div className="sidebar-footer">
          AI-Based Traffic Management
          <br />
          B.Tech Major Project
        </div>

      </aside>


      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="header">

          <div>
            <h1>Traffic Control Dashboard</h1>
            <p>AI-Based Smart Traffic Management System</p>
          </div>

          <div className="system-status">
            <span className="status-dot"></span>
            Prototype Dashboard
          </div>

        </header>


        {/* STATUS CARDS */}

        <section className="cards">

          <div className="card">
            <Car />
            <p>Total Roads</p>
            <h2>05</h2>
          </div>

          <div className="card">
            <Activity />
            <p>Analysis Status</p>
            <h2>{results ? "Completed" : "Pending"}</h2>
          </div>

          <div className="card">
            <Radio />
            <p>Selected Green Road</p>
            <h2>{selectedRoad || "--"}</h2>
          </div>

          <div className="card">
            <Wifi />
            <p>IoT Status</p>
            <h2>Not Connected</h2>
          </div>

        </section>


        {/* IMAGE UPLOAD */}

        <section className="panel">

          <div className="section-heading">

            <div>
              <h2>Upload Road Images</h2>
              <p>
                Upload five photographs for AI vehicle detection.
              </p>
            </div>

            <span className="badge">
              YOLO11n
            </span>

          </div>


          <div className="upload-grid">

            {roads.map((road, index) => (

              <div className="upload-box" key={road}>

                <h3>{road}</h3>

                <label className="upload-area">

                  {images[index] ? (

                    <img
                      src={images[index].preview}
                      alt={road}
                    />

                  ) : (

                    <div className="upload-placeholder">
                      <Upload size={30} />
                      <p>Upload Image</p>
                    </div>

                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageUpload(event, index)
                    }
                  />

                </label>

                <span>
                  {images[index] ? "Image Uploaded" : "Waiting for image"}
                </span>

              </div>

            ))}

          </div>


          {error && (
            <p className="error-message">{error}</p>
          )}


          <button
            className="analyze-btn"
            onClick={analyzeTraffic}
            disabled={analyzing}
          >

            {analyzing
              ? "Analyzing Traffic..."
              : "ANALYZE TRAFFIC"}

          </button>

        </section>


        {/* TRAFFIC ANALYSIS */}

        <section className="panel">

          <h2>Traffic Analysis Results</h2>

          <p className="subtitle">
            Vehicle detection and congestion information.
          </p>

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Road</th>
                  <th>Vehicle Count</th>
                  <th>Signal</th>
                </tr>
              </thead>

              <tbody>

                {signals.map((item) => {

                  // Check whether this road is in green_roads
                  const isGreen = results?.green_roads?.some(
                    (road) =>
                      road.toLowerCase() === item.road.toLowerCase()
                  );

                  const signal = !results
                    ? "PENDING"
                    : isGreen
                      ? "GREEN"
                      : "RED";

                  return (

                    <tr key={item.road}>

                      <td>{item.road.toUpperCase()}</td>

                      <td>
                        {results ? item.count : "--"}
                      </td>

                      <td>

                        <span
                          className={`signal ${signal.toLowerCase()}`}
                        >
                          {signal}
                        </span>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        </section>


        {/* SYSTEM FLOW */}

        <section className="panel">

          <h2>System Architecture Status</h2>

          <div className="architecture">

            <div>React Dashboard</div>
            <span>→</span>

            <div>FastAPI</div>
            <span>→</span>

            <div>YOLO11n</div>
            <span>→</span>

            <div>Firebase</div>
            <span>→</span>

            <div>ESP32</div>

          </div>

          <p className="subtitle">
            Architecture represents the planned integration.
            Individual connections will be activated during development.
          </p>

        </section>


        <footer>
          AI-Based Smart Traffic Management and Adaptive Signal Control System
        </footer>

      </main>

    </div>
  );
}

export default App;
# EA Football Predictor

A web application for predicting football match outcomes, tracking results, and managing a community leaderboard.

#### ⚽️ Features

* **User Authentication**: Secure sign-up and sign-in functionality using Firebase Authentication.
* **Match Predictions**: Users can submit their predicted scores for upcoming football matches.
* **Live Updates**: Match information, including results and statuses (Upcoming, Live, Finished), are loaded dynamically.
* **Scoring System**: A detailed scoring logic calculates points based on a user's predictions, including points for:
    * Correct outcome (win, loss, or draw).
    * Correct home team goals.
    * Correct away team goals.
    * Correct goal difference.
* **Leaderboard**: A comprehensive, real-time leaderboard tracks player standings based on total points, weekly wins, and perfect scores.
* **Responsive Design**: The application is built using Bootstrap to ensure a clean, mobile-friendly interface.

#### 🚀 How to Run Locally

1.  **Clone the Repository**:
    ```bash
    git clone [your-repository-url]
    cd ea-football-predictor
    ```

2.  **Set up Firebase**:
    This application requires a Firebase project to store game data and user predictions.
    * Create a new project on the [Firebase Console](https://console.firebase.google.com/).
    * Enable **Firestore Database** and **Firebase Authentication** (with Email/Password sign-in).
    * Find your project's configuration details (API Key, Project ID, etc.) and replace the `firebaseConfig` object in your `index.html` and `tabla.html` files with your own.

3.  **Run a Local Server**:
    To properly load the Firebase module imports and other local files, you need to run a local web server. The simplest way is to use Python's built-in server.
    ```bash
    python3 -m http.server
    ```
    If you don't have Python, you can use a different web server like `npx serve`.

4.  **Open in Browser**:
    After the server starts, open your web browser and navigate to the address provided in the terminal, usually `http://localhost:8000`.

#### 🛠️ Technologies Used

* **Front-end**: HTML, CSS, JavaScript (ES Modules)
* **Frameworks**: Bootstrap 4.5.2
* **Backend as a Service (BaaS)**: Firebase
    * Firestore (for database)
    * Firebase Authentication (for user management)
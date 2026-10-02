from flask import Flask, render_template, request, redirect, session, jsonify, flash
from db import Base, engine, SessionLocal
from ai import analyze_resume
import models
import PyPDF2
import docx
import json

app = Flask(__name__)
app.secret_key = "secret123"

Base.metadata.create_all(bind=engine)


def extract_text(file):
    """PDF ya DOCX se text nikalta hai."""
    name = file.filename.lower()

    if name.endswith(".pdf"):
        reader = PyPDF2.PdfReader(file)
        return "".join((page.extract_text() or "") for page in reader.pages)

    if name.endswith(".docx"):
        document = docx.Document(file)
        return "\n".join(p.text for p in document.paragraphs)

    raise ValueError("Sirf PDF ya DOCX file upload karo")


@app.route("/")
def home():
    if "user" in session:
        return redirect("/dashboard")
    return redirect("/login")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        password = request.form.get("password") or ""

        if len(password) < 6:
            flash("Password kam se kam 6 characters ka hona chahiye", "error")
            return redirect("/signup")

        db = SessionLocal()
        try:
            existing_user = db.query(models.User).filter_by(email=email).first()

            if existing_user:
                flash("Ye email already registered hai", "error")
                return redirect("/signup")

            user = models.User(email=email, password=password)
            db.add(user)
            db.commit()
        finally:
            db.close()

        flash("Account ban gaya! Ab login karo", "success")
        return redirect("/login")

    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        password = request.form.get("password") or ""

        db = SessionLocal()
        try:
            user = db.query(models.User).filter_by(
                email=email,
                password=password
            ).first()
        finally:
            db.close()

        if user:
            session["user"] = user.email
            return redirect("/dashboard")

        flash("Email ya password galat hai", "error")
        return redirect("/login")

    return render_template("login.html")


@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/login")

    return render_template("dashboard.html", user=session["user"])


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    if "user" not in session:
        return jsonify({"error": "Session expire ho gaya, dobara login karo"}), 401

    user_goal = (request.form.get("role") or "").strip()
    resume_text = (request.form.get("resume") or "").strip()
    file = request.files.get("file")

    if file and file.filename:
        try:
            resume_text = extract_text(file)
        except Exception as e:
            return jsonify({"error": f"File error: {e}"}), 400

    if not resume_text.strip() or not user_goal:
        return jsonify({"error": "Resume (text ya file) aur goal dono chahiye"}), 400

    result = analyze_resume(resume_text, user_goal)

    # Sirf successful analysis history me save karo
    if not result.get("error"):
        db = SessionLocal()
        try:
            user = db.query(models.User).filter_by(email=session["user"]).first()
            report = models.Report(
                user_id=user.id,
                resume_text=resume_text,
                results=json.dumps(result)
            )
            db.add(report)
            db.commit()
        except Exception as e:
            print("History save error:", e)
        finally:
            db.close()

    return jsonify(result)


@app.route("/history")
def history():
    if "user" not in session:
        return redirect("/login")

    db = SessionLocal()
    try:
        user = db.query(models.User).filter_by(email=session["user"]).first()

        reports = (
            db.query(models.Report)
            .filter_by(user_id=user.id)
            .order_by(models.Report.id.desc())
            .all()
        )

        parsed_reports = []
        for r in reports:
            try:
                parsed_result = json.loads(r.results)
            except Exception:
                parsed_result = {}

            parsed_reports.append({
                "resume": r.resume_text or "",
                "result": parsed_result
            })
    finally:
        db.close()

    return render_template("history.html", reports=parsed_reports)


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


if __name__ == "__main__":
    app.run(debug=True)
from datetime import datetime
from pathlib import Path

from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.config["SECRET_KEY"] = "cambia-esta-clave-secreta"
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{BASE_DIR / 'registros.db'}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "Inicia sesión para continuar."

ACTIVITY_LABELS = {
    "aceite": "Baldes de aceite recogidos",
    "trampas_baldes": "Baldes con trampas",
    "fumigacion": "Fumigación",
    "desratizacion": "Desratización",
    "residuos": "Recojo de residuos",
    "limpieza_trampa_grasa": "Limpieza de trampa de grasa",
}

QUANTITY_TYPES = {"aceite", "trampas_baldes"}


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    activity_type = db.Column(db.String(40), nullable=False)
    quantity = db.Column(db.Integer, nullable=True)
    activity_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


@login_manager.user_loader
def load_user(user_id: str):
    return User.query.get(int(user_id))


@app.context_processor
def inject_helpers():
    return {
        "activity_labels": ACTIVITY_LABELS,
        "quantity_types": QUANTITY_TYPES,
        "today": datetime.utcnow().date(),
    }


@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            flash("Bienvenido al sistema.", "success")
            return redirect(url_for("dashboard"))

        flash("Usuario o contraseña incorrectos.", "danger")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Sesión cerrada correctamente.", "info")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    activities = Activity.query.order_by(Activity.activity_date.desc(), Activity.id.desc()).all()

    summary = {key: 0 for key in ACTIVITY_LABELS}
    for activity in activities:
        if activity.activity_type in QUANTITY_TYPES:
            summary[activity.activity_type] += activity.quantity or 0
        else:
            summary[activity.activity_type] += 1

    return render_template("dashboard.html", activities=activities, summary=summary)


@app.route("/activity/new", methods=["GET", "POST"])
@login_required
def create_activity():
    if request.method == "POST":
        activity_type = request.form.get("activity_type", "")
        activity_date_raw = request.form.get("activity_date", "")
        quantity_raw = request.form.get("quantity", "").strip()
        notes = request.form.get("notes", "").strip() or None

        if activity_type not in ACTIVITY_LABELS:
            flash("Selecciona un tipo de registro válido.", "danger")
            return render_template("activity_form.html")

        if not activity_date_raw:
            flash("La fecha es obligatoria.", "danger")
            return render_template("activity_form.html")

        try:
            activity_date = datetime.strptime(activity_date_raw, "%Y-%m-%d").date()
        except ValueError:
            flash("Formato de fecha inválido.", "danger")
            return render_template("activity_form.html")

        quantity = None
        if activity_type in QUANTITY_TYPES:
            if not quantity_raw:
                flash("Debes indicar la cantidad de baldes.", "danger")
                return render_template("activity_form.html")
            try:
                quantity = int(quantity_raw)
                if quantity < 0:
                    raise ValueError
            except ValueError:
                flash("La cantidad debe ser un número entero positivo.", "danger")
                return render_template("activity_form.html")

        activity = Activity(
            activity_type=activity_type,
            quantity=quantity,
            activity_date=activity_date,
            notes=notes,
        )
        db.session.add(activity)
        db.session.commit()
        flash("Registro guardado correctamente.", "success")
        return redirect(url_for("dashboard"))

    return render_template("activity_form.html")


def initialize_database() -> None:
    db.create_all()
    if not User.query.filter_by(username="admin").first():
        user = User(username="admin")
        user.set_password("admin123")
        db.session.add(user)
        db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        initialize_database()
    app.run(debug=True)

from flask import Blueprint, render_template, redirect, url_for, request, flash
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
from flask_login import login_user, login_required, logout_user



from . import db

auth = Blueprint('auth', __name__)


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))

@auth.route('/login')
def login():
    return render_template('login.html')

@auth.route('/login', methods=['POST'])
def login_post():
    email = request.form.get('email')
    password = request.form.get('password')
    remember = True if request.form.get('remember') else False

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        flash('Please check your login details and try again.')
        return redirect(url_for('auth.login')) 
    
    login_user(user, remember=remember)
    return redirect(url_for('main.profile'))


@auth.route('/signup')
def signup():
    return render_template('signup.html')

@auth.route('/signup', methods=['POST'])
def signup_post():
    email = request.form.get('email')
    first_name = request.form.get('first_name')
    surname = request.form.get('surname')
    username = request.form.get('username')
    password = request.form.get('password')

    user = User.query.filter_by(email=email).first()

    if user: 
        flash('Email address already exists')
        return redirect(url_for('auth.signup'))
    
    new_user = User(
        email=email,
        username=username,
        first_name=first_name,
        surname=surname,
        password=generate_password_hash(password, method='pbkdf2:sha256')
    )

    db.session.add(new_user)
    db.session.commit()

    return redirect(url_for('auth.login'))

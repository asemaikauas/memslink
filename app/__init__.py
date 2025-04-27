from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os 

from flask_migrate import Migrate

db = SQLAlchemy()



def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = 'nfactorial-2025'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    from .models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))



    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    @app.route('/create_tables')
    def create_tables():
        with app.app_context():
            db.create_all()
        return "✅ Tables created successfully!"
    @app.route('/static/<path:filename>')
    def static_files(filename):
        return send_from_directory('static', filename)



    return app

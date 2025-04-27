from . import db
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    surname = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    
    actions = db.relationship('UserAction', backref='user', lazy=True, cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', backref='user', lazy=True, cascade='all, delete-orphan')
    stats = db.relationship('UserStat', backref='user', uselist=False, lazy=True, cascade='all, delete-orphan')

class Meme(db.Model):
    __tablename__ = 'memes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    image_url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UserAction(db.Model):
    __tablename__ = 'user_actions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    meme_id = db.Column(db.Integer, db.ForeignKey('memes.id'), nullable=False)
    action_type = db.Column(db.String(20), nullable=False)  
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    
    __table_args__ = (db.UniqueConstraint('user_id', 'meme_id'),)

class Favorite(db.Model):
    __tablename__ = 'favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    meme_id = db.Column(db.Integer, db.ForeignKey('memes.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'meme_id', name='favorites_user_id_meme_id_key'),
    )


class UserStat(db.Model):
    __tablename__ = 'user_stats'
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    likes_count = db.Column(db.Integer, default=0)
    dislikes_count = db.Column(db.Integer, default=0)
    favorites_count = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

User.actions = db.relationship('UserAction', backref='user', lazy=True, cascade='all, delete-orphan')
User.favorites = db.relationship('Favorite', backref='user', lazy=True, cascade='all, delete-orphan')
User.stats = db.relationship('UserStat', backref='user', uselist=False, lazy=True, cascade='all, delete-orphan')
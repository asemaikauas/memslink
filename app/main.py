from collections import defaultdict
from flask import Blueprint, render_template, jsonify, request, current_app, send_from_directory
from . import db
from flask_login import login_required, current_user
import os
import random
import time
import requests
import base64
from dotenv import load_dotenv
import traceback
from sqlalchemy.exc import SQLAlchemyError
from .models import User, Meme, UserAction, Favorite, UserStat
from datetime import datetime 
from sqlalchemy.exc import IntegrityError
import openai
import uuid
from flask import current_app

UPLOAD_FOLDER = '/tmp/generated'

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')


MEME_PROMPTS = [
    "A meme about struggles of student life",
    "A meme about funny moments of student life",
    "A meme about culture of successful success",
    "A meme about a cat with sunglasses and experiencing some good life situation",
    "A meme of confused dog looking at a computer and suggesting something",
    "A meme about modern day romantic relationships and dating culture",
    "A meme about the use of ChatGPT in Kazakh society",
    "A meme about AI taking jobs",
    "A meme about procrastination among IT specialists before projects",
    "An internet meme about different programming bugs",
    "A meme about unloveable Monday mornings",
    "A meme about finally Friday coming out",
    "A meme about coffee addiction",
    "A meme about overthinking"
]

generated_memes_cache = {}

photo_catalog = {
    "surprised_bugs_bunny": {
        "path": "/static/memes/temp6.jpg",
        "description": "Bugs Bunny looking unimpressed but slightly surprised, like saying 'wow bro, unexpected but cool'"
    },
    "chill_blob": {
        "path": "/static/memes/temp11.jpeg",
        "description": "A blob-like creature sitting calmly after doing something wrong or embarrassing, acting unbothered"
    },
    "crying_cat": {
        "path": "/static/memes/temp13.jpg",
        "description": "A white cat with big teary eyes, looking very sad and emotional, almost crying"
    },
    "universal_cat": {
        "path": "/static/memes/temp12.jpg",
        "description": "A cute wide-eyed cat with a funny smile, suitable for almost any funny situation"
    }
}


main = Blueprint('main', __name__)

def get_or_create_meme(meme_id, data):
    meme = Meme.query.get(meme_id)
    if meme:
        return meme

    if 'imageUrl' in data:
        meme = Meme(
            title=data.get('title', 'Мем без названия'),
            image_url=data['imageUrl']
        )
        db.session.add(meme)
        db.session.flush()  
        return meme
    else:
        return None


@main.route('/')
def index():
    return render_template('index.html')

@main.route('/profile')
@login_required
def profile():
    return render_template('profile.html', first_name=current_user.first_name) 

@main.route('/swipe') 
@login_required
def swipe():
    return render_template('swipe.html')

@main.route('/api/generate-meme', methods=['GET'])
@login_required
def generate_meme():
    try:
        cache_key = str(int(time.time()) // 3600)  # Cache per hour

        if cache_key in generated_memes_cache:
            cached_memes = generated_memes_cache[cache_key]
            if cached_memes:
                meme = cached_memes.pop(0)
                return jsonify(meme)

        prompt = random.choice(MEME_PROMPTS)
        print(f"Generating meme with prompt: {prompt}")

        response = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            },
            json={
                "model": "dall-e-3",
                "prompt": f"Create humorous meme with text: {prompt}. Your audience is mostly young people.",
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json"
            }
        )

        if response.status_code != 200:
            print(f"OpenAI API error: {response.status_code}")
            print(response.text)
            return jsonify({
                "error": "Failed to generate meme",
                "status": response.status_code
            }), 500

        result = response.json()

        if 'data' in result and len(result['data']) > 0:
            image_data = result['data'][0].get('b64_json')

            if image_data:
                # Use /tmp/generated instead of static/
                upload_dir = '/tmp/generated'
                os.makedirs(upload_dir, exist_ok=True)

                image_filename = f"ai_meme_{int(time.time())}.png"
                save_path = os.path.join(upload_dir, image_filename)

                print(f"Saving AI-generated image to: {save_path}")

                image_bytes = base64.b64decode(image_data)
                with open(save_path, "wb") as f:
                    f.write(image_bytes)

                # Now serve from /uploads/ instead of /static/
                image_url = f"/uploads/{image_filename}"

                return jsonify({
                    "imageUrl": image_url,
                    "title": f"AI Meme: {prompt.split(':')[-1] if ':' in prompt else prompt}"
                })

        return jsonify({
            "error": "No image data returned from API"
        }), 500

    except Exception as e:
        print(f"Error generating meme: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to generate meme",
            "details": str(e)
        }), 500

    
@main.route('/api/batch-generate-memes', methods=['GET'])
@login_required
def batch_generate_memes():
    try:
        count = int(request.args.get('count', 5))
        count = min(count, 10) 
        
        cache_key = str(int(time.time()) // 3600)  
        generated_memes_cache[cache_key] = []
        
        for _ in range(count):
            prompt = random.choice(MEME_PROMPTS)
            
            response = requests.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_API_KEY}"
                },
                json={
                    "model": "dall-e-3",
                    "prompt": f"Create a humorous internet meme with text: {prompt}. Make it funny and shareable.",
                    "n": 1,
                    "size": "1024x1024",
                    "response_format": "b64_json"
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and len(result['data']) > 0:
                    image_data = result['data'][0].get('b64_json')
                    
                    if image_data:
                        image_filename = f"ai_meme_{int(time.time())}_{_}.png"
                        save_path = os.path.join('/tmp/generated', image_filename)
                        
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        
                        image_bytes = base64.b64decode(image_data)
                        with open(save_path, "wb") as f:
                            f.write(image_bytes)
                        
                        image_url = f"/uploads/{image_filename}"
                        
                        generated_memes_cache[cache_key].append({
                            "imageUrl": image_url,
                            "title": f"AI Meme: {prompt.split(':')[-1] if ':' in prompt else prompt}"
                        })
            
            time.sleep(1)
        
        return jsonify({
            "status": "success",
            "count": len(generated_memes_cache[cache_key]),
            "message": f"Generated {len(generated_memes_cache[cache_key])} memes"
        })
        
    except Exception as e:
        print(f"Error batch generating memes: {str(e)}")
        print(traceback.format_exc())  
        return jsonify({
            "error": "Failed to batch generate memes",
            "details": str(e)
        }), 500


@main.route('/api/save-meme', methods=['POST'])
@login_required
def save_meme():
    data = request.json
    if not data or 'memeId' not in data:
        return jsonify({"error": "Missing meme ID"}), 400
        
    return jsonify({
        "status": "success",
        "message": "Meme saved to favorites"
    })

@main.route('/api/preferences', methods=['POST'])
@login_required
def update_preferences():
    data = request.json
    if not data:
        return jsonify({"error": "Missing preference data"}), 400
        
    return jsonify({
        "status": "success",
        "message": "Preferences updated"
    })


@main.route('/favorites')
@login_required
def favorites():
    return render_template('favorites.html')


@main.route('/api/favorites', methods=['GET'])
@login_required
def get_favorites():
    try:
        favorites = Favorite.query.filter_by(user_id=current_user.id).order_by(Favorite.created_at.desc()).all()
        result = []
        
        for fav in favorites:
            meme = Meme.query.get(fav.meme_id)
            if meme:
                result.append({
                    'id': meme.id,
                    'title': meme.title,
                    'imageUrl': meme.image_url,
                    'savedAt': fav.created_at.isoformat() if fav.created_at else None
                })
        
        return jsonify({'favorites': result})
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@main.route('/api/favorites/<int:meme_id>', methods=['POST'])
@login_required
def add_to_favorites(meme_id):
    try:
        data = request.json or {}

        with db.session.no_autoflush: 
            meme = get_or_create_meme(meme_id, data)
            if meme is None:
                return jsonify({'error': 'Мем не найден и нет данных для создания'}), 404

            existing = Favorite.query.filter_by(user_id=current_user.id, meme_id=meme.id).first()
            if existing:
                return jsonify({'message': 'Этот мем уже в избранном'}), 200

            favorite = Favorite(user_id=current_user.id, meme_id=meme.id)
            db.session.add(favorite)

        stats = UserStat.query.filter_by(user_id=current_user.id).first()
        if stats:
            stats.favorites_count += 1
            stats.last_updated = datetime.utcnow()
        else:
            stats = UserStat(
                user_id=current_user.id,
                favorites_count=1,
                likes_count=0,
                dislikes_count=0,
            )
            db.session.add(stats)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Конфликт: мем уже сохранен другим пользователем'}), 409

        return jsonify({'message': 'Мем добавлен в избранное'}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@main.route('/api/favorites/<int:meme_id>', methods=['DELETE'])
@login_required
def remove_from_favorites(meme_id):
    try:
        favorite = Favorite.query.filter_by(user_id=current_user.id, meme_id=meme_id).first()
        if not favorite:
            return jsonify({'error': 'Мем не найден в избранном'}), 404
            
        db.session.delete(favorite)
        
        stats = UserStat.query.filter_by(user_id=current_user.id).first()
        if stats and stats.favorites_count > 0:
            stats.favorites_count -= 1
            stats.last_updated = datetime.utcnow()
            
        db.session.commit()
        return jsonify({'message': 'Мем удален из избранного'}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@main.route('/api/user/stats', methods=['GET'])
@login_required
def get_user_stats():
    try:
        stats = UserStat.query.filter_by(user_id=current_user.id).first()
        
        if not stats:
            stats = UserStat(
                user_id=current_user.id,
                likes_count=0,
                dislikes_count=0,
                favorites_count=0
            )
            db.session.add(stats)
            db.session.commit()
        
        likes = UserAction.query.filter_by(user_id=current_user.id, action_type='like').count()
        dislikes = UserAction.query.filter_by(user_id=current_user.id, action_type='dislike').count()
        favorites = Favorite.query.filter_by(user_id=current_user.id).count()
        
        if stats.likes_count != likes or stats.dislikes_count != dislikes or \
           stats.favorites_count != favorites:
            stats.likes_count = likes
            stats.dislikes_count = dislikes
            stats.favorites_count = favorites
            db.session.commit()
        
        return jsonify({
            'stats': {
                'likes': stats.likes_count,
                'dislikes': stats.dislikes_count,
                'favorites': stats.favorites_count,
                'total_swipes': stats.likes_count + stats.dislikes_count ,
                'last_updated': stats.last_updated.isoformat() if stats.last_updated else None
            }
        })
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@main.route('/api/memes/action', methods=['POST'])
@login_required
def register_meme_action():
    try:
        data = request.json
        if not data or 'memeId' not in data or 'actionType' not in data:
            return jsonify({'error': 'Отсутствуют необходимые поля'}), 400

        meme_id = data['memeId']
        action_type = data['actionType']

        if action_type not in ['like', 'dislike']:
            return jsonify({'error': 'Недопустимый тип действия'}), 400

        with db.session.no_autoflush:  
            meme = get_or_create_meme(meme_id, data)
            if meme is None:
                return jsonify({'error': 'Мем не найден и нет данных для создания'}), 404

            existing_action = UserAction.query.filter_by(
                user_id=current_user.id,
                meme_id=meme.id,
                action_type=action_type
            ).first()

            if existing_action:
                return jsonify({'message': 'Действие уже зарегистрировано'}), 200

            UserAction.query.filter_by(
                user_id=current_user.id,
                meme_id=meme.id
            ).delete()

            new_action = UserAction(
                user_id=current_user.id,
                meme_id=meme.id,
                action_type=action_type
            )
            db.session.add(new_action)

        stats = UserStat.query.filter_by(user_id=current_user.id).first()
        if not stats:
            stats = UserStat(
                user_id=current_user.id,
                likes_count=0,
                dislikes_count=0,
                favorites_count=Favorite.query.filter_by(user_id=current_user.id).count()
            )
            db.session.add(stats)

        likes_count = UserAction.query.filter_by(user_id=current_user.id, action_type='like').count()
        dislikes_count = UserAction.query.filter_by(user_id=current_user.id, action_type='dislike').count()

        stats.likes_count = likes_count
        stats.dislikes_count = dislikes_count
        stats.last_updated = datetime.utcnow()

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Конфликт: действие уже было сохранено другим пользователем'}), 409

        show_matches = False
        if action_type == 'like' and likes_count >= 10:
            show_matches = True

        return jsonify({
            'message': 'Действие зарегистрировано',
            'showMatches': show_matches
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': f'Database error occurred: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@main.route('/api/get-user-matches', methods=['GET'])
@login_required
def get_user_matches():
    try:
        my_likes = UserAction.query.filter_by(
            user_id=current_user.id,
            action_type='like'
        ).all()
        my_meme_ids = {ua.meme_id for ua in my_likes}

        if len(my_meme_ids) < 10:
            return jsonify({
                "error": "Not enough likes to find matches. Like more memes!"
            }), 400

        likes_on_same_memes = UserAction.query.filter(
            UserAction.meme_id.in_(my_meme_ids),
            UserAction.user_id != current_user.id,
            UserAction.action_type == 'like'
        ).all()

        user_matches = defaultdict(int)
        for ua in likes_on_same_memes:
            user_matches[ua.user_id] += 1

        matched_users = []
        for uid, cnt in user_matches.items():
            if cnt >= 2:
                u = User.query.get(uid)
                matched_users.append({
                    "id":         u.id,
                    "name":       u.username,
                })

        return jsonify({ "matches": matched_users })

    except Exception as e:
        current_app.logger.error(f"Error fetching matches: {e}")
        return jsonify({
            "error":   "Failed to fetch matches",
            "details": str(e)
        }), 500



@main.route('/meme_generator')
def meme_generator():
    return render_template('generator.html')

@main.route('/generate_meme', methods=['POST'])
def generate_meme_2():
    data = request.get_json()
    situation = data.get('situation')
    
    openai.api_key = OPENAI_API_KEY

    if not situation:
        return jsonify({"error": "No situation provided"}), 400

    photo_prompt = "Available photos:\n"
    for key, value in photo_catalog.items():
        if key != "universal_cat": 
            photo_prompt += f"- {key}: {value['description']}\n"

    full_prompt = f"""{photo_prompt}

Situation: "{situation}"

Question: Which photo fits best? Respond ONLY with the photo key (for example, 'crying_cat'), nothing else.
"""

    try:
        photo_response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": full_prompt}],
            temperature=0.5
        )
        selected_photo_key = photo_response['choices'][0]['message']['content'].strip()

    except Exception as e:
        print(f"Error selecting photo: {e}")
        selected_photo_key = "universal_cat"

    if selected_photo_key not in photo_catalog:
        selected_photo_key = "universal_cat"

    caption_prompt = f"""Create a short, funny meme caption (max 15 words) based on this situation: "{situation}".
The mood should match the selected photo: {photo_catalog[selected_photo_key]['description']}.
Be witty, ironic, and relatable. Your audience is young people. Use all caps and meme-style writing. 
"""

    try:
        caption_response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": caption_prompt}],
            temperature=0.7
        )
        meme_text = caption_response['choices'][0]['message']['content'].strip()
        meme_text = meme_text.replace('"', '').replace("'", '')

    except Exception as e:
        print(f"Error generating caption: {e}")
        meme_text = "When life happens... just smile."

    return jsonify({
        "photo_url": photo_catalog[selected_photo_key]['path'],
        "caption": meme_text
    })

@main.route('/upload_meme', methods=['POST'])
def upload_meme():
    if 'meme' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    meme_file = request.files['meme']

    upload_dir = os.path.join(current_app.root_path, 'static', 'generated')

    
    filename = f"meme_{uuid.uuid4().hex}.png"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    meme_file.save(filepath)
    
    relative_path = f"/static/generated/{filename}"
    meme_url = request.host_url.rstrip('/') + relative_path

    return jsonify({'meme_url': meme_url})

@main.route('/uploads/<filename>')
def serve_uploaded_meme(filename):
    return send_from_directory('/tmp/generated', filename)

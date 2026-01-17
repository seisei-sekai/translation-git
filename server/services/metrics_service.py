"""
Metrics Service - System metrics computation and management
Business logic for metrics_service
"""
from datetime import datetime, timedelta
from extensions import db
from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app
import re
from sqlalchemy import JSON

def check_and_update_metrics():
    """Automatically update metrics every minute"""
    # Local import to avoid circular dependency
    from models.metrics import Metrics
    
    try:
        # Get or create metrics record
        metrics = Metrics.query.first()
        if not metrics:
            metrics = Metrics()
            db.session.add(metrics)
            db.session.commit()
        
        # Update metrics
        success = metrics.obtain_snapshot_now()
        
        if success:
            current_app.logger.info(f"Metrics updated successfully at {datetime.utcnow().isoformat()}")
        else:
            current_app.logger.error("Failed to update metrics")
            
    except Exception as e:
        current_app.logger.error(f"Error in metrics update job: {str(e)}")
        
# Schedule the metrics update job
scheduler = BackgroundScheduler()
scheduler.add_job(
    func=check_and_update_metrics,
    trigger="interval",
    minutes=30
)

# Start the scheduler when the app starts
scheduler.start()

def filter_timeseries_data(data_dict, hours=24, max_points=500):
    """
    Filter time-series data to reduce payload size with intelligent downsampling
    - Only keep data within the specified time range (hours=0 means all time)
    - Downsample to max_points if necessary using smart sampling
    - Preserves first and last points for accurate range display
    """
    if not isinstance(data_dict, dict):
        return data_dict
    
    # Separate timestamp entries from other entries
    timestamp_entries = {}
    other_entries = {}
    
    timestamp_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
    
    for key, value in data_dict.items():
        if timestamp_pattern.match(str(key)):
            timestamp_entries[key] = value
        else:
            other_entries[key] = value
    
    # If no timestamp entries, return as is
    if not timestamp_entries:
        return data_dict
    
    # Get date range info for logging
    if timestamp_entries:
        timestamps = sorted(timestamp_entries.keys())
        oldest = timestamps[0] if timestamps else None
        newest = timestamps[-1] if timestamps else None
        current_app.logger.info(f"Data range: {oldest} to {newest}, Total points: {len(timestamp_entries)}, Hours filter: {hours}")
    
    # Filter by time range (hours=0 means all time)
    if hours > 0:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        filtered_entries = {
            k: v for k, v in timestamp_entries.items()
            if datetime.fromisoformat(k.replace('Z', '+00:00').split('.')[0]) >= cutoff_time
        }
        current_app.logger.info(f"After time filter ({hours}h): {len(filtered_entries)} points")
    else:
        filtered_entries = timestamp_entries
        current_app.logger.info(f"All time selected: {len(filtered_entries)} points")
    
    # Intelligent downsampling if too many points
    if len(filtered_entries) > max_points:
        sorted_entries = sorted(filtered_entries.items())
        total_points = len(sorted_entries)
        
        # Calculate step size
        step = max(1, total_points // max_points)
        
        # Keep first point, evenly sampled middle points, and last point
        sampled = [sorted_entries[0]]  # Always keep first point
        
        # Sample middle points
        for i in range(step, total_points - 1, step):
            sampled.append(sorted_entries[i])
        
        # Always keep last point
        if sorted_entries[-1] not in sampled:
            sampled.append(sorted_entries[-1])
        
        filtered_entries = dict(sampled)
        current_app.logger.info(f"After downsampling: {len(filtered_entries)} points")
    
    # Combine filtered timestamp entries with other entries
    result = {**other_entries, **filtered_entries}
    return result

def get_latest_value(data_dict):
    """Get the most recent value from a time-series dict"""
    if not isinstance(data_dict, dict):
        return data_dict
    
    timestamp_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
    timestamp_entries = {
        k: v for k, v in data_dict.items()
        if timestamp_pattern.match(str(k))
    }
    
    if not timestamp_entries:
        return data_dict
    
    latest_key = max(timestamp_entries.keys())
    return timestamp_entries[latest_key]

def clean_old_metrics_data(metrics, days_to_keep=None):
    """
    Remove metrics data older than specified days
    If days_to_keep is None, keep all data (no cleaning)
    """
    if days_to_keep is None:
        return  # Keep all historical data
    
    cutoff_time = datetime.utcnow() - timedelta(days=days_to_keep)
    timestamp_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
    
    for column in metrics.__table__.columns:
        if isinstance(column.type, JSON):
            column_name = column.name
            data = getattr(metrics, column_name)
            
            if isinstance(data, dict):
                # Filter out old timestamp entries
                cleaned_data = {
                    k: v for k, v in data.items()
                    if not timestamp_pattern.match(str(k)) or
                    datetime.fromisoformat(k.replace('Z', '+00:00').split('.')[0]) >= cutoff_time
                }
                setattr(metrics, column_name, cleaned_data)
    
    db.session.commit()


from asyncio import Queue, Lock, new_event_loop, set_event_loop
import asyncio
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class RateLimitWindow:
    requests: int = 0
    window_start: datetime = datetime.now()
    
class TranslationQueueManager:
    def __init__(self, requests_per_minute=500):  # OpenAI tier 1 limit
        # Initialize event loop if not exists
        try:
            self.loop = asyncio.get_event_loop()
        except RuntimeError:
            self.loop = new_event_loop()
            set_event_loop(self.loop)
            
        self.queue = Queue()
        self.processing = False
        self.rate_limit_lock = Lock()
        self.requests_per_minute = requests_per_minute
        self.current_window = RateLimitWindow()
        
    async def add_translation_request(self, func, *args, **kwargs):
        # Add request to queue
        task_id = id(args[1])  # Use original_text's id as task_id
        future = self.loop.create_future()
        await self.queue.put((task_id, func, args, kwargs, future))
        
        # Start processing if not already running
        if not self.processing:
            self.processing = True
            self.loop.create_task(self._process_queue())
            
        return await future
    
    async def _check_rate_limit(self):
        async with self.rate_limit_lock:
            now = datetime.now()
            # Reset window if more than a minute has passed
            if now - self.current_window.window_start > timedelta(minutes=1):
                self.current_window = RateLimitWindow(window_start=now)
            
            if self.current_window.requests >= self.requests_per_minute:
                wait_time = 60 - (now - self.current_window.window_start).seconds
                await asyncio.sleep(wait_time)
                self.current_window = RateLimitWindow(window_start=now)
                
            self.current_window.requests += 1
    
    async def _process_queue(self):
        while True:
            try:
                if self.queue.empty():
                    self.processing = False
                    break
                    
                task_id, func, args, kwargs, future = await self.queue.get()
                
                # Check rate limit before processing
                await self._check_rate_limit()
                
                # Process translation
                try:
                    result = await self._execute_translation(func, *args, **kwargs)
                    future.set_result(result)
                except Exception as e:
                    future.set_exception(e)
                finally:
                    self.queue.task_done()
                    
            except Exception as e:
                print(f"Error processing queue: {str(e)}")
                continue
    
    async def _execute_translation(self, func, *args, **kwargs):
        # Convert synchronous function to async
        return await self.loop.run_in_executor(None, func, *args, **kwargs)

# Create global queue manager instance with proper event loop initialization
def create_translation_queue():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = new_event_loop()
        set_event_loop(loop)
    return TranslationQueueManager()

translation_queue = create_translation_queue()
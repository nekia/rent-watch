#!/bin/bash

# session="rent-watch-test"

# tmux new-session -d -s $session

# window=1
# tmux rename-window -t $session:$window 'redis'
# tmux send-keys -t $session:$window 'cd cacheMgr; ./start_local_test.sh' C-m

# tmux select-window -t $session:$window
tmux split-window -v
tmux split-window -h
tmux select-pane -t 0
tmux split-window -h
tmux resize-pane -U 10
tmux select-pane -t 2
tmux split-window -v
tmux select-pane -t 4
tmux split-window -v
tmux split-window -v

tmux select-pane -t 1
tmux send-keys 'cd cacheMgr; ./start_local_test.sh' C-m

tmux select-pane -t 2
tmux send-keys 'cd areaInfoMgr; ./start_local_test.sh' C-m

tmux select-pane -t 3
tmux send-keys 'cd scanner/suumo; ./start_local_test.sh' C-m

tmux select-pane -t 4
tmux send-keys 'cd scanner/suumo; ./start_local_test.sh' C-m

tmux select-pane -t 5
tmux send-keys 'cd crawler/suumo; ./start_local_test.sh' C-m

tmux select-pane -t 6
tmux send-keys 'cd notifier; ./start_local_test.sh' C-m

tmux select-pane -t 0
tmux send-keys 'sleep 5; cd main; ./start_local_test.sh' C-m

# tmux split-window -h -t $session:$window
# tmux split-window -v -t $session:$window
# tmux select-window -t $session:$window
# tmux select-pane -L
# tmux split-window -v -t $session:$window
# tmux resize-pane -U 15
# tmux send-keys -t $session:$window 'cd areaInfoMgr; ./start_local_test.sh' C-m

# tmux split-window -v -t $session:$window
# tmux send-keys -t $session:$window 'cd scanner/suumo; ./start_local_test.sh' C-m

# tmux split-window -v -t $session:$window
# tmux send-keys -t $session:$window 'cd crawler/suumo; ./start_local_test.sh' C-m

# tmux split-window -v -t $session:$window
# tmux send-keys -t $session:$window 'cd notifier; ./start_local_test.sh' C-m

# tmux split-window -v -t $session:$window
# tmux send-keys -t $session:$window 'cd main; ./start_local_test.sh' C-m

#window=1
#tmux new-window -t $session:$window -n 'vim'
#tmux send-keys -t $session:$window 'vim package.json'
#
#window=2
#tmux new-window -t $session:$window -n 'run'
#
#window=3
#tmux new-window -t $session:$window -n 'serve'
#tmux send-keys -t $session:$window 'npm run serve'
#
#tmux attach-session -t $session
#
##tmux new-session -d -s foo 'exec pfoo'
#tmux send-keys 'bundle exec thin start' 'C-m'
#tmux rename-window 'Foo'
#tmux select-window -t foo:0
#tmux split-window -h 'exec pfoo'
#tmux send-keys 'bundle exec compass watch' 'C-m'
#tmux split-window -v -t 0 'exec pfoo'
#tmux send-keys 'rake ts:start' 'C-m'
#tmux split-window -v -t 1 'exec pfoo'
#tmux -2 attach-session -t foo

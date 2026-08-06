from services.volume import get_volume

if __name__ == '__main__':
    try:
        from pycaw.pycaw import AudioUtilities

        s = AudioUtilities.GetSpeakers()
        print('GetSpeakers() ->', type(s))
        try:
            print('Has Activate?', hasattr(s, 'Activate'))
        except Exception:
            pass

        all_dev = AudioUtilities.GetAllDevices()
        print('GetAllDevices() ->', type(all_dev), 'len=', len(all_dev) if hasattr(all_dev, '__len__') else '?')
        for i, d in enumerate(all_dev[:5]):
            try:
                print(i, type(d), 'attrs=', [a for a in dir(d) if not a.startswith('_')][:20])
            except Exception as e:
                print('err listing device', e)

        print('\nAttempting get_volume()...')
        print(get_volume())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('ERROR:', e)
